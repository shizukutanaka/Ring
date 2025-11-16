# 本番環境デプロイメントガイド

WebRTC Call Recorder を本番環境にデプロイするための詳細ガイドです。

## デプロイメント環境

本ガイドは以下の環境を想定しています：

- **クラウドプラットフォーム**: AWS, GCP, Azure
- **コンテナ**: Docker & Kubernetes
- **CI/CD**: GitHub Actions
- **データベース**: PostgreSQL 12+
- **監視**: Prometheus & Grafana（推奨）

---

## 1. 本番環境前のチェックリスト

### セキュリティ

- [ ] HTTPS/TLS 証明書の取得（Let's Encrypt 推奨）
- [ ] JWT シークレットキーの強化（40文字以上のランダム値）
- [ ] 環境変数の安全な管理（シークレット管理サービス）
- [ ] API レート制限の設定
- [ ] CORS の適切な設定
- [ ] ログの暗号化設定
- [ ] バックアップとディザスタリカバリプラン

### パフォーマンス

- [ ] データベーステーブルのインデックス最適化
- [ ] キャッシュレイヤー（Redis）の設定
- [ ] CDN の設定（静的アセット用）
- [ ] 負荷試験の実施
- [ ] 自動スケーリングルールの定義

### コンプライアンス

- [ ] 法規DB の最新化と弁護士レビュー
- [ ] プライバシーポリシー・利用規約の作成
- [ ] データ保持ポリシーの実装
- [ ] 監査ログの有効化
- [ ] GDPR/APPI 適合性確認

---

## 2. AWS へのデプロイ（推奨例）

### ステップ 1: IAM ロールの作成

```bash
# ECS タスク実行ロール
aws iam create-role --role-name webrtc-ecs-task-execution-role \
  --assume-role-policy-document file://trust-policy.json

# CloudWatch ログへのアクセス
aws iam attach-role-policy --role-name webrtc-ecs-task-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

### ステップ 2: RDS PostgreSQL の作成

```bash
aws rds create-db-instance \
  --db-instance-identifier webrtc-call-recorder \
  --db-instance-class db.t3.small \
  --engine postgres \
  --engine-version 15.2 \
  --master-username postgres \
  --master-user-password "<SECURE_PASSWORD>" \
  --allocated-storage 100 \
  --storage-type gp3 \
  --publicly-accessible false \
  --backup-retention-period 30 \
  --multi-az
```

### ステップ 3: VPC とセキュリティグループの設定

```bash
# VPC 作成
aws ec2 create-vpc --cidr-block 10.0.0.0/16

# セキュリティグループ
aws ec2 create-security-group \
  --group-name webrtc-sg \
  --description "WebRTC Call Recorder Security Group" \
  --vpc-id <VPC_ID>

# インバウンドルール
aws ec2 authorize-security-group-ingress \
  --group-id <SG_ID> \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id <SG_ID> \
  --protocol tcp \
  --port 5432 \
  --source-group <SG_ID>
```

### ステップ 4: ECR リポジトリの作成

```bash
aws ecr create-repository \
  --repository-name webrtc-call-recorder-server \
  --region us-east-1

# イメージをプッシュ
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

docker build -t webrtc-call-recorder-server ./server
docker tag webrtc-call-recorder-server:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/webrtc-call-recorder-server:latest
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/webrtc-call-recorder-server:latest
```

### ステップ 5: ECS クラスター作成

```bash
aws ecs create-cluster --cluster-name webrtc-cluster

# Fargate では自動的に起動可能
```

### ステップ 6: CloudFormation テンプレート（推奨）

`infra/cloudformation/webrtc-stack.yaml`:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'WebRTC Call Recorder Infrastructure'

Parameters:
  Environment:
    Type: String
    Default: production
  DatabasePassword:
    Type: String
    NoEcho: true

Resources:
  WebRTCDB:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: webrtc-db
      Engine: postgres
      EngineVersion: '15.2'
      DBInstanceClass: db.t3.small
      AllocatedStorage: 100
      MasterUsername: postgres
      MasterUserPassword: !Ref DatabasePassword

  WebRTCECSCluster:
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: webrtc-cluster

  WebRTCLoadBalancer:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Scheme: internet-facing
      Type: application
      Subnets:
        - subnet-12345678
        - subnet-87654321

Outputs:
  DBEndpoint:
    Value: !GetAtt WebRTCDB.Endpoint.Address
  LoadBalancerDNS:
    Value: !GetAtt WebRTCLoadBalancer.DNSName
```

デプロイ：

```bash
aws cloudformation create-stack \
  --stack-name webrtc-production \
  --template-body file://infra/cloudformation/webrtc-stack.yaml \
  --parameters ParameterKey=DatabasePassword,ParameterValue=<PASSWORD>
```

---

## 3. Kubernetes へのデプロイ

### ステップ 1: クラスター作成

```bash
# EKS クラスター作成
eksctl create cluster --name webrtc-prod --version 1.28 --nodegroup-name ng1 --nodes 3 --nodes-min 1 --nodes-max 10

# または GKE
gcloud container clusters create webrtc-prod --num-nodes=3 --machine-type=n1-standard-2
```

### ステップ 2: Namespace と Secret 作成

```bash
kubectl create namespace webrtc-prod

# シークレット作成
kubectl create secret generic webrtc-secrets \
  --from-literal=database-url=postgresql://user:password@db:5432/webrtc \
  --from-literal=jwt-secret=<SECURE_JWT_SECRET> \
  -n webrtc-prod
```

### ステップ 3: Helm Chart 作成（推奨）

`infra/helm/webrtc/Chart.yaml`:

```yaml
apiVersion: v2
name: webrtc-call-recorder
description: WebRTC Call Recorder Helm Chart
version: 0.1.0
```

`infra/helm/webrtc/values.yaml`:

```yaml
replicaCount: 3

image:
  repository: <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/webrtc-call-recorder-server
  tag: latest
  pullPolicy: Always

service:
  type: LoadBalancer
  port: 80
  targetPort: 3000

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
```

デプロイ：

```bash
helm install webrtc ./infra/helm/webrtc -n webrtc-prod
```

### ステップ 4: Ingress 設定

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: webrtc-ingress
  namespace: webrtc-prod
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.example.com
      secretName: webrtc-tls
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: webrtc-service
                port:
                  number: 3000
```

---

## 4. GitHub Actions CI/CD パイプライン

`.github/workflows/deploy-production.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
    paths:
      - 'server/**'
      - '.github/workflows/deploy-production.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Build and push Docker image
        run: |
          aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${{ secrets.ECR_REGISTRY }}
          docker build -t webrtc-server ./server
          docker tag webrtc-server:latest ${{ secrets.ECR_REGISTRY }}/webrtc-server:latest
          docker push ${{ secrets.ECR_REGISTRY }}/webrtc-server:latest

      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster webrtc-prod \
            --service webrtc-service \
            --force-new-deployment

      - name: Verify deployment
        run: |
          curl https://api.example.com/health
```

---

## 5. 監視とロギング

### CloudWatch ログ設定

```json
{
  "logDriver": "awslogs",
  "options": {
    "awslogs-group": "/ecs/webrtc",
    "awslogs-region": "us-east-1",
    "awslogs-stream-prefix": "ecs"
  }
}
```

### Prometheus メトリクス収集

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'webrtc'
    static_configs:
      - targets: ['localhost:3000']
```

### Grafana ダッシュボード

ダッシュボードを `infra/grafana/dashboards/` に配置。

---

## 6. バックアップとディザスタリカバリ

### RDS 自動バックアップ

```bash
aws rds modify-db-instance \
  --db-instance-identifier webrtc-db \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00" \
  --apply-immediately
```

### 定期的な復旧テスト

```bash
# 復旧点まで復元テスト
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier webrtc-db-restore \
  --db-snapshot-identifier webrtc-db-snapshot
```

---

## 7. スケーリング戦略

### 水平スケーリング

```yaml
# HPA (Horizontal Pod Autoscaler)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: webrtc-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webrtc-server
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 80
```

### データベーススケーリング

```bash
# Read レプリカの追加
aws rds create-db-instance-read-replica \
  --db-instance-identifier webrtc-db-read \
  --source-db-instance-identifier webrtc-db
```

---

## 8. セキュリティ強化

### SSL/TLS 証明書

```bash
# Let's Encrypt（無料）
certbot certonly --standalone -d api.example.com

# または AWS Certificate Manager
aws acm request-certificate \
  --domain-name api.example.com \
  --validation-method DNS
```

### WAF（Web Application Firewall）

```bash
# AWS WAF ルール例
aws wafv2 create-ip-set \
  --name webrtc-waf-ip-set \
  --scope CLOUDFRONT \
  --ip-address-version IPV4 \
  --addresses 203.0.113.0/24
```

---

## 9. 本番環境起動チェックリスト

デプロイ前の最終確認：

- [ ] すべてのシークレット/環境変数が設定されている
- [ ] TLS/SSL 証明書が有効
- [ ] データベースバックアップが実行されている
- [ ] モニタリング・ログが有効
- [ ] ディザスタリカバリプランが文書化されている
- [ ] ロードテストが完了し、許容範囲内
- [ ] セキュリティスキャンが実施済み
- [ ] 利用規約・プライバシーポリシーが公開済み
- [ ] 法務レビューが完了
- [ ] SLA・対応計画が定義されている

---

## 10. 運用ハンドブック

### ローリングアップデート

```bash
# 新バージョンデプロイ
kubectl set image deployment/webrtc \
  webrtc=myregistry/webrtc:v0.2.0 \
  --record -n webrtc-prod

# ロールバック
kubectl rollout undo deployment/webrtc -n webrtc-prod
```

### 緊急対応

```bash
# Pod 再起動
kubectl rollout restart deployment/webrtc -n webrtc-prod

# スケール調整
kubectl scale deployment webrtc --replicas=5 -n webrtc-prod
```

---

## 参考資料

- [AWS ECS ベストプラクティス](https://docs.aws.amazon.com/ja_jp/AmazonECS/)
- [Kubernetes 本番環境チェックリスト](https://kubernetes.io/docs/concepts/configuration/overview/)
- [OWASP デプロイメントチェックリスト](https://cheatsheetseries.owasp.org/)

---

**最後の更新**: 2025-11-17
**バージョン**: 0.1.0
