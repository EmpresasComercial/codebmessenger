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
