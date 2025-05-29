const express = require('express');
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Loaded from Render
const cors = require('cors');

app.use(cors());
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
      success_url: 'https://yourdomain.com/success',
      cancel_url: 'https://yourdomain.com/cancel',
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

app.listen(4242, () => console.log('Server is running on port 4242'));
