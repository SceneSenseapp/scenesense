import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || 'SceneSense Production';
    const rating = searchParams.get('rating') || 'N/A';
    const persona = searchParams.get('persona') || 'Auteur Director';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#050505',
            backgroundImage: 'radial-gradient(circle at 25% 25%, #2a0808 0%, #050505 100%)',
            padding: '60px',
            fontFamily: 'sans-serif',
            color: 'white',
            border: '4px solid rgba(220, 38, 38, 0.3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '4px', color: '#dc2626' }}>
              SCENESENSE STUDIO
            </span>
            <span style={{ fontSize: '20px', backgroundColor: 'rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '8px' }}>
              {persona}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h1 style={{ fontSize: '64px', fontWeight: '900', margin: 0, lineHeight: 1.1, textShadow: '0 0 30px rgba(220,38,38,0.5)' }}>
              {title}
            </h1>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid rgba(255,255,255,0.1)', paddingTop: '24px' }}>
            <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#fbbf24' }}>
              ★ {rating} / 10 TMDB Rating
            </span>
            <span style={{ fontSize: '20px', color: '#9ca3af' }}>
              Autonomous Cinematic Intelligence
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch {
    return new Response('Failed to generate OG image', { status: 500 });
  }
}