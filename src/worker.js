const through2 = require('through2');
const Lightning = require('./lightning/lightning');
const Invoice = require('./models/invoice');
const User = require('./models/user');

const ln = new Lightning(
  process.env.LND_IP,
  process.env.LND_PORT,
  process.env.MACAROON_BASE64,
);

class Worker {
  async start() {
    setInterval(async () => {
      const invoices = await Invoice.find({settled_at: null, state: 'PENDING'})
        .sort('-created_at')
        .limit(10)
        .exec();

      invoices.forEach(async invoice => {
        const r_hash = Buffer.from(invoice.r_hash, 'base64').toString('hex');
        const invoiceLn = await ln.getInvoice(r_hash);

        // TODO: Constant
        if (invoiceLn.state === 'SETTLED') {
          await invoice.update({
            state: 'SETTLED',
            settled_at: new Date(),
          });
          console.log(invoice);

          const user = await User.findOne({_id: invoice.userId});
          console.log(user);

          await user.updateOne({
            $inc: {
              balance: new Number(invoice.value),
            },
          });
        }

      });
    }, 1000);
  }
}

module.exports = Worker;
