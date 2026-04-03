import { adminDb } from './lib/firebase-admin';

async function getSubscriptionsReport() {
  try {
    const subsSnapshot = await adminDb.collection('subscriptions').get();
    const usersSnapshot = await adminDb.collection('users').get();
    
    console.log(`\n=== TimetabiQ Subscriptions Report ===`);
    console.log(`Total Subs in DB: ${subsSnapshot.size}`);
    
    let activeSubs = 0;
    const planCounts = {};
    const statusCounts = {};

    subsSnapshot.forEach(doc => {
      const data = doc.data();
      const status = data.status;
      const plan = data.plan;

      statusCounts[status] = (statusCounts[status] || 0) + 1;
      planCounts[plan] = (planCounts[plan] || 0) + 1;

      if (['active', 'trialling', 'trialing', 'past_due'].includes(status?.toLowerCase())) {
        activeSubs++;
      }
    });

    console.log(`\nActive/Trialling Subs: ${activeSubs}`);
    console.log(`\nBreakdown by Status:`);
    for (const [status, count] of Object.entries(statusCounts)) {
      console.log(`- ${status}: ${count}`);
    }

    console.log(`\nBreakdown by Plan:`);
    for (const [plan, count] of Object.entries(planCounts)) {
      console.log(`- ${plan}: ${count}`);
    }
    
    let paidUsers = 0;
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.tier && data.tier !== 'FREE') {
        paidUsers++;
      }
    });
    
    console.log(`\nTotal Users with Tier > FREE: ${paidUsers}`);
    
  } catch(e) {
    console.error('Error fetching subscriptions:', e);
  }
}

getSubscriptionsReport();
