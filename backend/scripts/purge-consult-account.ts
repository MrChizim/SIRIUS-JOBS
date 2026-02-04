import 'dotenv/config';
import { connectMongo, disconnectMongo } from '../src/config/mongo.js';
import { ConsultAccount } from '../src/models/ConsultAccount.js';

async function main() {
  const emailArg = process.argv[2];

  if (!emailArg) {
    console.error('Usage: npm run consult:prune <email>');
    process.exit(1);
  }

  const email = emailArg.trim().toLowerCase();

  try {
    await connectMongo();

    const accounts = await ConsultAccount.find({ email }).sort({ createdAt: 1 });
    if (accounts.length <= 1) {
      console.log(`No duplicate consultation accounts found for ${email}.`);
      return;
    }

    // Keep the oldest account (index 0) and remove the rest.
    const [keep, ...duplicates] = accounts;
    const duplicateIds = duplicates.map(account => account.id);

    await ConsultAccount.deleteMany({ _id: { $in: duplicateIds } });

    console.log(
      `Removed ${duplicates.length} duplicate consultation account(s) for ${email}. Preserved account ${keep.id}.`,
    );
  } finally {
    await disconnectMongo();
  }
}

main().catch(error => {
  console.error('Unable to prune consultation accounts', error);
  process.exit(1);
});
