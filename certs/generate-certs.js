const fs = require('fs');
const path = require('path');
const forge = require('node-forge');

const pki = forge.pki;

// Helper to create a certificate
function createCert(cn, issuer, issuerKey, isCA = false) {
    const keys = pki.rsa.generateKeyPair(2048);
    const cert = pki.createCertificate();

    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01' + forge.util.bytesToHex(forge.random.getBytesSync(10));
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

    const attrs = [{ name: 'commonName', value: cn }];
    cert.setSubject(attrs);
    cert.setIssuer(issuer ? issuer.subject.attributes : attrs);

    if (isCA) {
        cert.setExtensions([{
            name: 'basicConstraints',
            cA: true
        }]);
    } else {
        cert.setExtensions([{
            name: 'basicConstraints',
            cA: false
        }, {
            name: 'keyUsage',
            digitalSignature: true,
            keyEncipherment: true
        }, {
            name: 'extKeyUsage',
            serverAuth: true,
            clientAuth: true
        }, {
            name: 'subjectAltName',
            altNames: [{
                type: 2, // DNS
                value: 'localhost'
            }, {
                type: 7, // IP
                ip: '127.0.0.1'
            }]
        }]);
    }

    cert.sign(issuerKey || keys.privateKey, forge.md.sha256.create());

    return {
        cert: pki.certificateToPem(cert),
        key: pki.privateKeyToPem(keys.privateKey)
    };
}

console.log('Generating certificates...');

// 1. Generate CA
console.log('Generating CA...');
const ca = createCert('WebRTC Recorder CA', null, null, true);
fs.writeFileSync(path.join(__dirname, 'ca-cert.pem'), ca.cert);
fs.writeFileSync(path.join(__dirname, 'ca-key.pem'), ca.key);

// 2. Generate Server Cert
console.log('Generating Server Certificate...');
const caCertObj = pki.certificateFromPem(ca.cert);
const caKeyObj = pki.privateKeyFromPem(ca.key);
const server = createCert('localhost', caCertObj, caKeyObj);
fs.writeFileSync(path.join(__dirname, 'server-cert.pem'), server.cert);
fs.writeFileSync(path.join(__dirname, 'server-key.pem'), server.key);

// 3. Generate Client Cert
console.log('Generating Client Certificate...');
const client = createCert('WebRTC Client', caCertObj, caKeyObj);
fs.writeFileSync(path.join(__dirname, 'client-cert.pem'), client.cert);
fs.writeFileSync(path.join(__dirname, 'client-key.pem'), client.key);

console.log('Certificates generated successfully in ./certs');
