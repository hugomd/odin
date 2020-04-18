const through2 = require('through2');
const Lightning = require('./lightning/lightning');
const {Invoice, User, sequelize} = require('./models');

const ln = new Lightning(
  process.env.LND_IP,
  process.env.LND_PORT,
  process.env.MACAROON_BASE64,
);

class Worker {
  async start() {
    setInterval(async () => {
      const invoices = await Invoice.findAll({
        where: {settledAt: null, state: 'PENDING'},
        order: ['createdAt'],
        limit: 10,
      });

      const invoicePromises = invoices.map(async invoice => {
        const r_hash = Buffer.from(invoice.r_hash, 'base64').toString('hex');
        const invoiceLn = await ln.getInvoice(r_hash);

        // TODO: Constant
        if (invoiceLn.state === 'SETTLED') {
          const t = await sequelize.transaction();

          try {
            await invoice.update(
              {
                state: 'SETTLED',
                settledAt: new Date(),
              },
              {transaction: t},
            );

            const user = await User.findOne({where: {id: invoice.userId}});

            await user.update(
              {
                balance: user.balance + invoice.value,
              },
              {transaction: t},
            );

            await t.commit();
          } catch (err) {
            await t.rollback();
          }
        }
      });

      await Promise.all(invoicePromises);
    }, 5000);
  }
}

module.exports = Worker;
