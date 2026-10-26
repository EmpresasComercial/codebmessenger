<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/0b2e227e-bac9-4afc-90cc-a2da89d8ab44

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Help center email

The Help Center form sends messages through the `send-support-email` Supabase Edge Function and Resend (it does not open an email app). Configure the Resend API key and a verified sender address as Supabase secrets, then deploy the function:

```sh
supabase secrets set RESEND_API_KEY=your_resend_api_key SUPPORT_FROM_EMAIL=your_verified_sender@example.com
supabase functions deploy send-support-email
```

Messages are delivered to `contacta@telegramas.cc`; replies go to the email address entered in the form.

## Firebase bot commissions and group notifications

Bot activation and referral commissions run in the Firebase callable function. The first purchase by a referred account pays the existing 10% / 6% / 2% level rates only when its value is between 3,000 Kz and 2,800,000 Kz, inclusive. The purchase, balance changes, and commission ledger entries are committed in one Firestore transaction.

Group-message Web Push and notification records are handled by the Firebase `notifyCommunityMessage` Firestore trigger. Users must grant browser notification permission and have an active push subscription. While the group is open in a background tab, the page also displays a local browser notification.

Deploy the Firebase functions and Firestore rules after configuring a new VAPID key pair:

1. Generate a replacement VAPID pair because the previous private key was exposed.
2. Set the private key as a Firebase Functions secret with `firebase functions:secrets:set VAPID_PRIVATE_KEY`.
3. Put the matching public key in `functions/.env.<firebase-project-id>` as `VAPID_PUBLIC_KEY=...` and in the production build environment as `VITE_VAPID_PUBLIC_KEY=...`. Do not commit either environment file.
4. Run `npm run build:functions` and `npm run build`; deploy the callable and trigger first with `firebase deploy --only functions`, then apply rules with `firebase deploy --only firestore:rules`.

Existing browser subscriptions use the old VAPID key and are renewed with the replacement when users next enable notifications.
