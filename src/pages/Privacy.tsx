import { Link } from 'react-router-dom';
import LegalPage, { LegalSection } from '@/components/LegalPage';

const UPDATED = '25 October 2026';
const EMAIL = 'info@chekameds.co.bw';

const sections: LegalSection[] = [
  {
    id: 'who',
    title: '1. Who we are',
    body: (
      <>
        <p>ChekaMeds (chekameds.co.bw and our WhatsApp numbers) is operated by <b>IBLIM Enterprises (Pty) Ltd</b>, a company registered in Botswana (CIPA BW00002903575), Plot 54014, Phase 4, Gaborone, Botswana. We are the data controller for the personal data described in this policy.</p>
        <p>Contact us about privacy at <a href={`mailto:${EMAIL}`}>{EMAIL}</a> or +267 75 560 140.</p>
        <p>This policy explains what we collect, why, who we share it with, how long we keep it and the rights you have under Botswana's Data Protection Act, 2024 and, where they apply to you, other data protection laws.</p>
      </>
    ),
  },
  {
    id: 'what',
    title: '2. What we collect',
    body: (
      <>
        <p>We only collect what we need for the service you use.</p>
        <div className="cm-legal-tbl">
          <table>
            <thead><tr><th>When you…</th><th>We collect</th></tr></thead>
            <tbody>
              <tr><td>Search for a medicine on the website</td><td>The words you search. If nothing is found, we save the search term (without your name or number) so pharmacies can see unmet demand.</td></tr>
              <tr><td>Message us on WhatsApp</td><td>Your WhatsApp number and profile name, your messages (medicine, town, any photo of a prescription you choose to send) and our replies.</td></tr>
              <tr><td>Request a video consultation</td><td>Your name, phone or WhatsApp number, location, symptoms and how long you have had them, age group, pregnancy status (optional), existing conditions, allergies, any prescription link you add, danger signs you tick, and the partner facility you choose.</td></tr>
              <tr><td>Request a delivery</td><td>Patient name, phone number, delivery address, the medicine and pharmacy, any notes, and the delivery PIN and status.</td></tr>
              <tr><td>Register or log in as a pharmacy or clinic</td><td>Facility details, staff names, email address, phone number, login details and the stock you upload.</td></tr>
              <tr><td>Send a partner or licensing enquiry</td><td>Your name, organisation, job title, country, email, phone, and what you tell us about your market.</td></tr>
              <tr><td>Use the website</td><td>Basic technical data our hosting providers record automatically (such as IP address, browser and pages requested) and small settings stored on your device, such as whether you dismissed a banner.</td></tr>
            </tbody>
          </table>
        </div>
        <h3>Health information</h3>
        <p>Symptoms, conditions, allergies, prescriptions and pregnancy status are <b>sensitive personal data</b>. We process them only with your consent, which you give when you submit a consultation request, and only to connect you with a participating healthcare provider. You can withdraw consent at any time (see section 7). Please do not send health information we have not asked for.</p>
      </>
    ),
  },
  {
    id: 'why',
    title: '3. How we use it',
    body: (
      <ul>
        <li><b>To provide the service:</b> show which pharmacies report a medicine in stock, answer your WhatsApp search, pass your consultation request to the ChekaMeds review team or the facility you chose, and send delivery requests to the pharmacy.</li>
        <li><b>To keep you safe:</b> requests with danger signs are flagged so they are seen first. ChekaMeds does not diagnose or prescribe; providers make clinical decisions.</li>
        <li><b>To contact you</b> about your request, including by WhatsApp, SMS or phone.</li>
        <li><b>To run and improve ChekaMeds:</b> fix problems, prevent misuse and understand which medicines people cannot find. Demand reports we share with pharmacies, distributors or partners use <b>aggregated, de-identified data only</b> and never name you.</li>
        <li><b>To reply to business enquiries</b> from pharmacies and partners.</li>
        <li><b>To meet legal obligations</b> and respond to lawful requests.</li>
      </ul>
    ),
  },
  {
    id: 'basis',
    title: '4. Our legal grounds',
    body: (
      <ul>
        <li><b>Consent</b> for health information and for optional messages.</li>
        <li><b>Providing a service you asked for</b> (searches, consultation and delivery requests, pharmacy accounts).</li>
        <li><b>Legitimate interests</b> in running a safe, reliable service and producing de-identified demand insights, balanced against your rights.</li>
        <li><b>Legal obligation</b> where the law requires us to keep or disclose information.</li>
      </ul>
    ),
  },
  {
    id: 'share',
    title: '5. Who we share it with',
    body: (
      <>
        <p>We do not sell your personal data. We share it only as follows:</p>
        <ul>
          <li><b>Participating pharmacies, clinics and providers</b> you choose or are routed to, so they can confirm stock, arrange delivery or hold your consultation. They handle your information under their own professional and legal duties.</li>
          <li><b>Service providers</b> who process data for us under contract: website hosting and delivery (Vercel), database and storage (Supabase), WhatsApp messaging (Meta and our WhatsApp gateway provider), email (Resend), video calls (Daily), and maps and fonts (Google). Our DNS is managed by Cloudflare.</li>
          <li><b>Authorities</b> when the law requires it, or to protect someone's life or safety.</li>
          <li><b>A buyer or investor</b> in ChekaMeds, under confidentiality and only if they continue this policy.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'transfers',
    title: '6. Where your data is stored',
    body: (
      <p>Some of our service providers store or process data on servers outside Botswana, for example in Europe or the United States. When personal data leaves Botswana we rely on the grounds the Data Protection Act allows, such as transfers needed to provide the service you asked for or your consent, and we take the steps the Act requires, including contractual protections with our providers.</p>
    ),
  },
  {
    id: 'rights',
    title: '7. Your rights',
    body: (
      <>
        <p>You can ask us to:</p>
        <ul>
          <li>tell you what personal data we hold about you and give you a copy;</li>
          <li>correct information that is wrong or incomplete;</li>
          <li>delete your information, where we no longer need it or you withdraw consent;</li>
          <li>stop or limit how we use it, or object to it, including direct marketing;</li>
          <li>withdraw your consent at any time. This does not affect what we did before.</li>
        </ul>
        <p>Email <a href={`mailto:${EMAIL}`}>{EMAIL}</a> or message +267 75 560 140. We may ask you to confirm your identity and will reply within 30 days. On WhatsApp you can reply <b>STOP</b> at any time to stop non-essential messages.</p>
        <p>If you are unhappy with how we handle your data, please tell us first. You can also complain to Botswana's <b>Information and Data Protection Commission</b>.</p>
      </>
    ),
  },
  {
    id: 'retention',
    title: '8. How long we keep it',
    body: (
      <ul>
        <li>Consultation and delivery requests: up to <b>24 months</b> after your last request, then deleted or de-identified, unless the law requires longer.</li>
        <li>WhatsApp conversations: up to <b>12 months</b>.</li>
        <li>Searches with no results: kept without identifying details for demand reporting.</li>
        <li>Pharmacy and partner accounts or enquiries: while the relationship lasts and up to <b>24 months</b> after.</li>
      </ul>
    ),
  },
  {
    id: 'security',
    title: '9. Security',
    body: (
      <p>Data is encrypted in transit, access to records is limited to authorised staff and the facility handling your request, and our database uses access rules so the public website cannot read requests or enquiries. No system is perfectly secure. If a breach is likely to put your rights at risk, we will notify the Information and Data Protection Commission within the time the law requires and tell you where needed.</p>
    ),
  },
  {
    id: 'children',
    title: '10. Children',
    body: (
      <p>Consultation requests for anyone under 18 should be made by a parent, guardian or caregiver, who gives consent on the child's behalf. If you believe a child has given us information without that consent, contact us and we will delete it.</p>
    ),
  },
  {
    id: 'device',
    title: '11. Cookies and storage on your device',
    body: (
      <p>We do not use advertising cookies. The website stores a few small settings on your device, such as your theme or that you closed a banner, and may store files so it loads faster and can be installed as an app. You can clear these in your browser settings at any time.</p>
    ),
  },
  {
    id: 'changes',
    title: '12. Changes to this policy',
    body: (
      <p>We will update this page when our practices change and show the date at the top. If a change is significant, we will tell you on the website or by message. See also our <Link to="/terms">Terms of Use</Link>.</p>
    ),
  },
];

export default function Privacy() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy Policy"
      updated={UPDATED}
      intro={<p style={{ margin: 0 }}>How ChekaMeds collects, uses and protects your information, including the health details you share when you ask for help.</p>}
      sections={sections}
      other={{ label: 'Terms of Use', to: '/terms' }}
    />
  );
}
