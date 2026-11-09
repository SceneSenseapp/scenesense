// app/api/og/route.js
import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Dynamic Parameter Parsing
    const title = searchParams.get('title') || 'SceneSense';
    const year = searchParams.get('year') || '';
    const rating = searchParams.get('rating') || '';
    const overview = searchParams.get('overview') || 'Neural Cinema Intelligence & Surveillance Radar';
    const mediaType = (searchParams.get('type') || 'cinema').toUpperCase();
    const poster = searchParams.get('poster') || '';
    const backdrop = searchParams.get('backdrop') || '';

    // Truncate overview to fit neatly on card
    const truncatedOverview =
      overview.length > 180 ? `${overview.slice(0, 180)}...` : overview;

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#050508',
            backgroundImage: backdrop
              ? `linear-gradient(to right, rgba(5,5,8,0.96) 30%, rgba(5,5,8,0.7) 100%), url(${backdrop})`
              : 'radial-gradient(circle at 25% 25%, #080d1a 0%, #050508 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            padding: '48px',
            position: 'relative',
            fontFamily: 'sans-serif',
            color: '#f8fafc',
            border: '2px solid rgba(6, 182, 212, 0.4)',
          }}
        >
          {/* Cyan Glow Halos */}
          <div
            style={{
              position: 'absolute',
              top: '-100px',
              left: '-100px',
              width: '400px',
              height: '400px',
              backgroundColor: 'rgba(6, 182, 212, 0.15)',
              borderRadius: '9999px',
              filter: 'blur(100px)',
            }}
          />

          {/* Top Tactical HUD Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              marginBottom: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '9999px',
                  backgroundColor: '#06b6d4',
                  boxShadow: '0 0 15px #06b6d4',
                }}
              />
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: 900,
                  letterSpacing: '0.25em',
                  color: '#06b6d4',
                  textTransform: 'uppercase',
                  fontFamily: 'monospace',
                }}
              >
                SCENESENSE // {mediaType} DOSSIER
              </span>
            </div>

            <span
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#64748b',
                fontFamily: 'monospace',
                letterSpacing: '0.15em',
              }}
            >
              SCENESENSE.APP
            </span>
          </div>

          {/* Main Visual Center Area */}
          <div style={{ display: 'flex', gap: '36px', alignItems: 'center', marginTop: '20px' }}>
            {/* Poster Thumbnail */}
            {poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={poster}
                alt={title}
                style={{
                  width: '200px',
                  height: '300px',
                  borderRadius: '16px',
                  objectFit: 'cover',
                  border: '2px solid rgba(6, 182, 212, 0.4)',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.8)',
                }}
              />
            ) : null}

            {/* Title & Metadata Details */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, maxWidth: poster ? '840px' : '1080px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                {year ? (
                  <span
                    style={{
                      backgroundColor: 'rgba(6, 182, 212, 0.15)',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                      color: '#67e8f9',
                      padding: '4px 12px',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                    }}
                  >
                    {year}
                  </span>
                ) : null}

                {rating ? (
                  <span
                    style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      color: '#fbbf24',
                      padding: '4px 12px',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontFamily: 'monospace',
                      fontWeight: 900,
                    }}
                  >
                    ★ {rating} / 10
                  </span>
                ) : null}
              </div>

              <h1
                style={{
                  fontSize: title.length > 30 ? '48px' : '62px',
                  fontWeight: 900,
                  lineHeight: 1.1,
                  margin: '0 0 16px 0',
                  color: '#ffffff',
                  textTransform: 'uppercase',
                  letterSpacing: '-0.02em',
                }}
              >
                {title}
              </h1>

              <p
                style={{
                  fontSize: '22px',
                  color: '#94a3b8',
                  lineHeight: 1.4,
                  margin: 0,
                  fontWeight: 400,
                }}
              >
                {truncatedOverview}
              </p>
            </div>
          </div>

          {/* Bottom Telemetry Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid rgba(6, 182, 212, 0.2)',
              paddingTop: '20px',
              marginTop: 'auto',
              fontFamily: 'monospace',
              fontSize: '14px',
              color: '#64748b',
            }}
          >
            <span>AI CINEMA RADAR • CROSS-PLATFORM SURVEILLANCE • REVIEWS</span>
            <span style={{ color: '#06b6d4' }}>STATUS: ONLINE</span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
        },
      }
    );
  } catch (error) {
    console.error('OG card generation failed:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}
