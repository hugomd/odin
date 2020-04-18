const https = require('https');
const axios = require('axios');
const qrcode = require('qrcode');
const Canvas = require('canvas');

const instance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
});

class Lightning {
  constructor(lndIP, lndPort, macaroon) {
    this.lndIP = lndIP;
    this.lndPort = lndPort;
    this.macaroon = macaroon;
  }

  async invoice(value) {
    const {data} = await instance({
      method: 'POST',
      url: `https://${this.lndIP}:${this.lndPort}/v1/invoices`,
      headers: {
        'Grpc-Metadata-macaroon': this.macaroon,
      },
      data: {
        value
      },
    });

    return data;
  }

  async getInvoice(r_hash) {
    const {data} = await instance({
      method: 'GET',
      url: `https://${this.lndIP}:${this.lndPort}/v1/invoice/${r_hash}`,
      headers: {
        'Grpc-Metadata-macaroon': this.macaroon,
      }
    });

    return data;
  }


  generateQR(paymentRequest) {
    return qrcode.toCanvas(Canvas.createCanvas(100, 100), paymentRequest);
  }

  async decodePaymentRequest(payment_request) {
    const {data} = await instance({
      method: 'GET',
      url: `https://${this.lndIP}:${this.lndPort}/v1/payreq/${payment_request}`,
      headers: {
        'Grpc-Metadata-macaroon': this.macaroon,
      }
    });

    return data;
  }

  async sendPayment(payment_request) {
    const {data} = await instance({
      method: 'POST',
      url: `https://${this.lndIP}:${this.lndPort}/v1/channels/transactions`,
      headers: {
        'Grpc-Metadata-macaroon': this.macaroon,
      },
      data: {
        payment_request
      }
    });

    return data;
  }
}

module.exports = Lightning;
