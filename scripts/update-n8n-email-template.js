'use strict';
/**
 * update-n8n-email-template.js
 * Updates the n8n "Order Email Notification" workflow with a new HTML template.
 *
 * Usage:
 *   node scripts/update-n8n-email-template.js <N8N_ADMIN_JWT>
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const N8N_HOST = 'n8n-n8n.tlsfxv.easypanel.host';
const WORKFLOW_ID = 'nJvQSF3dByXZxKK7';
const N8N_JWT = process.argv[2];

if (!N8N_JWT) {
    console.error('Usage: node scripts/update-n8n-email-template.js <N8N_ADMIN_JWT>');
    process.exit(1);
}

const EMAIL_HTML = fs.readFileSync(
    path.join(__dirname, 'email-template.html'),
    'utf8'
);

function apiRequest(method, urlPath, body) {
    return new Promise((resolve, reject) => {
        const bodyStr = body ? JSON.stringify(body) : null;
        const req = https.request({
            hostname: N8N_HOST,
            path: '/api/v1' + urlPath,
            method,
            headers: {
                'X-N8N-API-KEY': N8N_JWT,
                'Content-Type': 'application/json',
                ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
            }
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch (e) { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

(async () => {
    console.log('Fetching workflow ' + WORKFLOW_ID + '...');
    const { status: getStatus, body: workflow } = await apiRequest('GET', '/workflows/' + WORKFLOW_ID);

    if (getStatus !== 200) {
        console.error('Failed to fetch workflow (' + getStatus + '):', JSON.stringify(workflow).slice(0, 300));
        process.exit(1);
    }
    console.log('Got workflow: "' + workflow.name + '" (' + (workflow.nodes || []).length + ' nodes)');

    const emailNode = (workflow.nodes || []).find(n => n.type === 'n8n-nodes-base.emailSend');
    if (!emailNode) {
        console.error('emailSend node not found. Nodes:', (workflow.nodes || []).map(n => n.type).join(', '));
        process.exit(1);
    }

    console.log('Updating node: "' + emailNode.name + '"');

    emailNode.parameters = Object.assign({}, emailNode.parameters, {
        fromEmail: 'Ecu Gaming Import <soporte@ecugamingimport.top>',
        toEmail: '={{ $json.body.customerEmail }}',
        subject: '={{ {\'confirmando_pago\':\'Orden Generada\',\'orden_confirmada\':\'Pago Confirmado ✅\',\'empacando\':\'Pedido en Preparacion 📦\',\'enviado\':\'Pedido Enviado 🚀\',\'recibido\':\'Pedido Entregado 🎉\',\'cancelado\':\'Orden Cancelada\'}[$json.body.status] || \'Notificacion de Orden\' }} #={{ $json.body.orderId }} - Ecu Gaming Import',
        emailFormat: 'html',
        message: EMAIL_HTML,
        options: {
            appendAttribution: false
        }
    });

    // n8n PUT only accepts specific fields — strip metadata fields
    const payload = {
        name: workflow.name,
        nodes: workflow.nodes,
        connections: workflow.connections,
        settings: workflow.settings || {},
        staticData: workflow.staticData || null
    };

    console.log('Uploading updated workflow...');
    const { status: putStatus, body: result } = await apiRequest('PUT', '/workflows/' + WORKFLOW_ID, payload);

    if (putStatus !== 200) {
        console.error('Failed to update (' + putStatus + '):', JSON.stringify(result).slice(0, 500));
        process.exit(1);
    }

    console.log('Workflow updated: "' + result.name + '"');
    console.log('Template uploaded: ' + EMAIL_HTML.length + ' chars');
    console.log('appendAttribution: false — n8n footer removed');
    console.log('\nDone! The next email sent will use the new template.');
})();
