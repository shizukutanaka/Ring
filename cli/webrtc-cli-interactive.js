#!/usr/bin/env node

/**
 * WebRTC Call Recorder - Interactive CLI Mode
 * Menu-driven interface for easier management
 */

const inquirer = require('inquirer');
const chalk = require('chalk');
const { execSync } = require('child_process');

const CLI_PATH = require.resolve('./webrtc-cli.js');

async function main() {
    console.log(chalk.cyan.bold('\n╔════════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('║  WebRTC Call Recorder - Interactive   ║'));
    console.log(chalk.cyan.bold('╚════════════════════════════════════════╝\n'));

    while (true) {
        const { category } = await inquirer.prompt([
            {
                type: 'list',
                name: 'category',
                message: 'Select a category:',
                choices: [
                    { name: '👤 User Management', value: 'user' },
                    { name: '📞 Call Management', value: 'call' },
                    { name: '🎥 Codec Management', value: 'codec' },
                    { name: '✅ Consent Management', value: 'consent' },
                    { name: '📊 Server Status', value: 'status' },
                    { name: '💾 Database', value: 'db' },
                    new inquirer.Separator(),
                    { name: '🚪 Exit', value: 'exit' }
                ]
            }
        ]);

        if (category === 'exit') {
            console.log(chalk.green('\nGoodbye!\n'));
            process.exit(0);
        }

        await handleCategory(category);
    }
}

async function handleCategory(category) {
    switch (category) {
        case 'user':
            await handleUserCommands();
            break;
        case 'call':
            await handleCallCommands();
            break;
        case 'codec':
            await handleCodecCommands();
            break;
        case 'consent':
            await handleConsentCommands();
            break;
        case 'status':
            await handleStatusCommands();
            break;
        case 'db':
            await handleDbCommands();
            break;
    }
}

async function handleUserCommands() {
    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'User action:',
            choices: [
                'List users',
                'Create user',
                'Delete user',
                'Reset password',
                '← Back'
            ]
        }
    ]);

    if (action === '← Back') return;

    switch (action) {
        case 'List users':
            runCommand('user list');
            break;
        case 'Create user':
            const createData = await inquirer.prompt([
                { type: 'input', name: 'email', message: 'Email:' },
                { type: 'password', name: 'password', message: 'Password:' },
                { type: 'input', name: 'name', message: 'Name (optional):' },
                { type: 'list', name: 'role', message: 'Role:', choices: ['user', 'admin'] }
            ]);
            runCommand(`user create --email ${createData.email} --password ${createData.password} --name "${createData.name}" --role ${createData.role}`);
            break;
        case 'Delete user':
            const { userId } = await inquirer.prompt([
                { type: 'input', name: 'userId', message: 'User ID:' }
            ]);
            runCommand(`user delete --id ${userId}`);
            break;
        case 'Reset password':
            const resetData = await inquirer.prompt([
                { type: 'input', name: 'userId', message: 'User ID:' },
                { type: 'password', name: 'password', message: 'New password:' }
            ]);
            runCommand(`user reset-password --id ${resetData.userId} --password ${resetData.password}`);
            break;
    }

    await pause();
}

async function handleCallCommands() {
    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Call action:',
            choices: [
                'List calls',
                'Call details',
                '← Back'
            ]
        }
    ]);

    if (action === '← Back') return;

    switch (action) {
        case 'List calls':
            const listOptions = await inquirer.prompt([
                { type: 'input', name: 'days', message: 'Last N days (optional):' },
                { type: 'input', name: 'status', message: 'Status filter (optional):' }
            ]);
            let cmd = 'call list';
            if (listOptions.days) cmd += ` --days ${listOptions.days}`;
            if (listOptions.status) cmd += ` --status ${listOptions.status}`;
            runCommand(cmd);
            break;
        case 'Call details':
            const { callId } = await inquirer.prompt([
                { type: 'input', name: 'callId', message: 'Call ID:' }
            ]);
            runCommand(`call details --id ${callId}`);
            break;
    }

    await pause();
}

async function handleCodecCommands() {
    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Codec action:',
            choices: [
                'Show usage statistics',
                'Show quality metrics',
                'Show adaptations',
                '← Back'
            ]
        }
    ]);

    if (action === '← Back') return;

    switch (action) {
        case 'Show usage statistics':
            runCommand('codec list');
            break;
        case 'Show quality metrics':
            runCommand('codec quality');
            break;
        case 'Show adaptations':
            runCommand('codec adaptations');
            break;
    }

    await pause();
}

async function handleConsentCommands() {
    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Consent action:',
            choices: [
                'List requests',
                'Show statistics',
                'Verify signature',
                'Export user data (GDPR)',
                '← Back'
            ]
        }
    ]);

    if (action === '← Back') return;

    switch (action) {
        case 'List requests':
            const listOptions = await inquirer.prompt([
                { type: 'input', name: 'jurisdiction', message: 'Jurisdiction filter (optional):' }
            ]);
            let cmd = 'consent list';
            if (listOptions.jurisdiction) cmd += ` --jurisdiction ${listOptions.jurisdiction}`;
            runCommand(cmd);
            break;
        case 'Show statistics':
            runCommand('consent stats');
            break;
        case 'Verify signature':
            const { requestId } = await inquirer.prompt([
                { type: 'input', name: 'requestId', message: 'Consent request ID:' }
            ]);
            runCommand(`consent verify --id ${requestId}`);
            break;
        case 'Export user data (GDPR)':
            const exportData = await inquirer.prompt([
                { type: 'input', name: 'userId', message: 'User ID:' },
                { type: 'input', name: 'file', message: 'Output file (optional):' }
            ]);
            let exportCmd = `consent export --userId ${exportData.userId}`;
            if (exportData.file) exportCmd += ` --file ${exportData.file}`;
            runCommand(exportCmd);
            break;
    }

    await pause();
}

async function handleStatusCommands() {
    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Status action:',
            choices: [
                'Health check',
                'Show metrics',
                'Show statistics',
                '← Back'
            ]
        }
    ]);

    if (action === '← Back') return;

    switch (action) {
        case 'Health check':
            runCommand('status health');
            break;
        case 'Show metrics':
            runCommand('status metrics');
            break;
        case 'Show statistics':
            const { days } = await inquirer.prompt([
                { type: 'input', name: 'days', message: 'Last N days (optional):' }
            ]);
            runCommand(days ? `status stats --days ${days}` : 'status stats');
            break;
    }

    await pause();
}

async function handleDbCommands() {
    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Database action:',
            choices: [
                'Create backup',
                'Run migrations',
                'Seed database',
                '← Back'
            ]
        }
    ]);

    if (action === '← Back') return;

    switch (action) {
        case 'Create backup':
            const { filename } = await inquirer.prompt([
                { type: 'input', name: 'filename', message: 'Backup filename (optional):' }
            ]);
            runCommand(filename ? `db backup --file ${filename}` : 'db backup');
            break;
        case 'Run migrations':
            runCommand('db migrate');
            break;
        case 'Seed database':
            runCommand('db seed');
            break;
    }

    await pause();
}

function runCommand(cmd) {
    try {
        console.log(chalk.gray(`\n$ webrtc-cli ${cmd}\n`));
        execSync(`node ${CLI_PATH} ${cmd}`, { stdio: 'inherit' });
    } catch (error) {
        // Error already displayed by child process
    }
}

async function pause() {
    await inquirer.prompt([
        {
            type: 'input',
            name: 'continue',
            message: 'Press Enter to continue...'
        }
    ]);
}

main().catch(err => {
    console.error(chalk.red('Error:', err.message));
    process.exit(1);
});
