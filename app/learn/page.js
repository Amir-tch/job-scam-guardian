import Link from "next/link";
import BottomNav from "../components/BottomNav";

export default function Learn() {
  const bars = [
    { label: "2020", value: 90, max: 501, unit: "$M" },
    { label: "2024 H1", value: 220, max: 501, unit: "$M" },
    { label: "2024 Full Year", value: 501, max: 501, unit: "$M" },
  ];

  const taskBars = [
    { label: "2020", value: 0, max: 20000 },
    { label: "2023", value: 5000, max: 20000 },
    { label: "2024 H1", value: 20000, max: 20000 },
  ];

  return (
    <>
      <main className="container">
        <section className="hero">
          <div className="badge">LEARN</div>
          <h1>Understanding Job Scams in Nigeria</h1>
          <p>
            Recruitment fraud affects job seekers across Nigeria. Here is
            what the data shows.
          </p>
        </section>

        <section className="card">
          <h2>The Problem</h2>
          <p>
            Recruitment fraud is a major and growing problem in Nigeria. It
            affects job seekers and graduates across the country, driven by
            high unemployment and exploited by organized fraud networks.
          </p>
          <p>
            EFCC Chairman Ola Olukoyede stated Nigeria loses over N40 billion
            annually to fraudulent employment schemes, a figure that has
            persisted for years despite ongoing enforcement.
          </p>
          <p>
            In one case, EFCC arrested a fraudster who posed as a State House
            staff member and scammed job seekers of N22 million. Fraudsters
            have also repeatedly impersonated EFCC itself, running fake
            recruitment portals and demanding processing and accommodation
            fees from applicants.
          </p>
        </section>

        <section className="card">
          <h2>How These Scams Work in Nigeria</h2>
          <ul style={{ lineHeight: 1.8, paddingLeft: 20 }}>
            <li>
              Fake job portals and social media ads, often on Instagram,
              TikTok, and WhatsApp, advertise roles with high salaries and
              minimal requirements
            </li>
            <li>
              Upfront payment is requested for processing, training,
              onboarding, or medical tests, typically ranging from N5,000 to
              N500,000
            </li>
            <li>
              Fraudsters impersonate known companies or claim access to
              government slots, sometimes renting office space or holding
              fake interviews to appear legitimate
            </li>
            <li>
              Victims sometimes resign from real jobs before discovering the
              offer was fake
            </li>
            <li>
              Government agencies (EFCC, Customs, NAICOM) are frequently
              impersonated in fake recruitment drives
            </li>
          </ul>
        </section>

        <section className="card">
          <h2>Beyond Financial Loss: The Trafficking Link</h2>
          <p>
            Job scams in Nigeria carry a risk not always present elsewhere.
            NAPTIP and UNODC have warned that criminal networks increasingly
            use fake job offers, particularly ones promising overseas or
            remote work, to recruit Nigerians into forced labor and
            cyber-fraud operations abroad.
          </p>
          <p>
            NAPTIP rescued more than 300 victims of cyber-enabled
            trafficking in 2025, with 156 more rescued between January and
            July 2026. The agency has secured 839 convictions since its
            establishment.
          </p>
          <p>
            This is why this tool treats overseas and remote job offers with
            particular caution. A fake job offer in Nigeria is not only a
            financial risk. It can be a pathway to trafficking.
          </p>
        </section>

        <section className="card">
          <h2>Remote and Overseas Job Offers</h2>
          <p>
            Nigerian job seekers increasingly apply for remote roles offered
            by companies abroad, particularly in tech, customer service, and
            virtual assistant work. This exposes them to scam patterns
            documented internationally, not just locally.
          </p>
          <p>
            In the United States, the FTC reports job scam losses grew from
            $90 million in 2020 to $501 million in 2024, a nearly sixfold
            increase. Task-based scams, where victims are paid small amounts
            to build trust before being asked for an unlock fee, grew from
            zero reports in 2020 to 20,000 in the first half of 2024 alone.
          </p>

          <h3 style={{ marginTop: 20, marginBottom: 10 }}>
            US Job Scam Losses (FTC)
          </h3>
          {bars.map((bar) => (
            <div key={bar.label} style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  marginBottom: 4,
                }}
              >
                <span>{bar.label}</span>
                <span>
                  {bar.unit}
                  {bar.value}
                </span>
              </div>
              <div
                style={{
                  background: "#e5e7eb",
                  borderRadius: 6,
                  height: 12,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${(bar.value / bar.max) * 100}%`,
                    background: "#2d3648",
                    height: "100%",
                  }}
                />
              </div>
            </div>
          ))}

          <h3 style={{ marginTop: 24, marginBottom: 10 }}>
            US Task Scam Reports (FTC)
          </h3>
          {taskBars.map((bar) => (
            <div key={bar.label} style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  marginBottom: 4,
                }}
              >
                <span>{bar.label}</span>
                <span>{bar.value.toLocaleString()}</span>
              </div>
              <div
                style={{
                  background: "#e5e7eb",
                  borderRadius: 6,
                  height: 12,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${(bar.value / bar.max) * 100}%`,
                    background: "#6b7280",
                    height: "100%",
                  }}
                />
              </div>
            </div>
          ))}
        </section>

        <section className="card">
          <h2>The Data Gap</h2>
          <p>
            Nigeria does not publish centralized, regularly updated
            statistics on job scam volume the way some countries do. Most
            available data comes from case by case agency statements (EFCC,
            NAPTIP, NAICOM) rather than aggregated public reporting.
          </p>
          <p>
            This is part of why this tool exists. Each check run
            contributes anonymized data toward a clearer, current picture of
            how job scams actually appear to Nigerian job seekers.
          </p>
        </section>

        <section className="card">
          <h2>Official Recommendations</h2>
          <ul style={{ lineHeight: 1.8, paddingLeft: 20 }}>
            <li>
              Verify any recruitment claim directly through the agency or
              company's official channels, not through links or contacts
              provided in the offer message
            </li>
            <li>
              Treat any request for upfront payment (processing, training,
              accommodation, medical) as a red flag
            </li>
            <li>
              Be especially cautious with overseas or remote job offers
              reached through social media or WhatsApp
            </li>
            <li>
              Report suspicious recruitment messages to the relevant agency
              (EFCC, NAPTIP, NAICOM) or through this tool
            </li>
          </ul>
        </section>

        <div style={{ textAlign: "center", margin: "30px 0" }}>
          <Link href="/login">
            <button style={{ width: "auto", padding: "12px 24px" }}>
              Check a job offer now
            </button>
          </Link>
        </div>
      </main>

      <BottomNav />
    </>
  );
}