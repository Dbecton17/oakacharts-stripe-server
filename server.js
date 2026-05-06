const express = require('express');
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');

app.use(cors());

// ⚠️ Webhook MUST use raw body — must come BEFORE express.json()
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Forward to Google Apps Script
    const gasUrl = process.env.GAS_WEBHOOK_URL;
    await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
  }

  res.json({ received: true });
});

app.use(express.json());

app.post('/create-checkout-session', async (req, res) => {
  const { artist_song, collaborators, link, email } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'OakA Chart Submission',
          },
          unit_amount: 500,
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: email,
      success_url: 'https://theoaka.com/#success',
      cancel_url: 'https://theoaka.com/#cancel',
      metadata: {
        artist_song,
        collaborators,
        link
      }
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Stripe Error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// ✅ Fixed: use Render's dynamic port
const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
