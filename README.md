# Tweet Translator

An automated tool that monitors tweets from specified accounts, translates them, and reposts them to another account.

## Features

- Real-time tweet monitoring
- Automatic translation using OpenAI
- Configurable monitoring intervals
- Tweet status tracking
- OAuth integration with Twitter API

## Tech Stack

- Next.js 14
- React 18
- Supabase
- Twitter API v2
- OpenAI API
- Tailwind CSS

## Setup

1. Clone the repository:
```bash
git clone https://github.com/ayberkhelvaci/TweetTranslator.git
cd TweetTranslator
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file with the following variables:
```env
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_key
OPENAI_API_KEY=your_openai_key
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
```

4. Run the development server:
```bash
npm run dev
```

## Environment Variables

- `NEXTAUTH_SECRET`: Secret key for NextAuth.js
- `NEXTAUTH_URL`: Your application URL
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `OPENAI_API_KEY`: Your OpenAI API key
- `TWITTER_CLIENT_ID`: Your Twitter API client ID
- `TWITTER_CLIENT_SECRET`: Your Twitter API client secret

## License

MIT
