import { Link } from 'react-router-dom';
import LegalPage, { LegalSection } from '@/components/LegalPage';

const UPDATED = '25 October 2026';
const EMAIL = 'info@chekameds.co.bw';

const sections: LegalSection[] = [
  {
    id: 'about',
    title: '1. About these terms',
    body: (
      <>
        <p>These terms apply to your use of ChekaMeds: the website chekameds.co.bw, our WhatsApp and SMS services, and any related features. ChekaMeds is operated by IBLIM Enterprises (Pty) Ltd (CIPA BW00002903575), Gaborone, Botswana ("we", "us").</p>
        <p>By using ChekaMeds you agree to these terms and to our <Link to="/privacy">Privacy Policy</Link>. If you do not agree, please do not use the service.</p>
      </>
    ),
  },
  {
    id: 'service',
    title: '2. What ChekaMeds does',
    body: (
      <ul>
        <li>Shows which participating pharmacies <b>report</b> a medicine in stock, with prices where they list them.</li>
        <li>Lets you send delivery requests to a pharmacy and request a video consultation with a participating provider.</li>
        <li>Gives pharmacies and clinics tools to list stock and receive requests.</li>
      </ul>
    ),
  },
  {
    id: 'medical',
    title: '3. Not medical advice. Not for emergencies.',
    body: (
      <>
        <p><b>ChekaMeds does not diagnose, prescribe or give medical advice.</b> Information on the platform is for finding medicines and services. Always follow the advice of a qualified healthcare professional and read the medicine's label.</p>
        <p><b>In an emergency, go to the nearest clinic or hospital or call 997.</b> Do not wait for a reply from ChekaMeds.</p>
        <p>Video consultations are provided by independent, participating healthcare providers, who are responsible for their own clinical decisions and professional conduct. Prescription-only medicines are dispensed only by pharmacies, under the law.</p>
      </>
    ),
  },
  {
    id: 'stock',
    title: '4. Stock, prices and pharmacies',
    body: (
      <>
        <p>Stock levels and prices are reported by pharmacies and can change at any time. We do not guarantee that a medicine is available or that a listed price is current. <b>Always contact the pharmacy to confirm stock, price and opening hours before you travel.</b></p>
        <p>Pharmacies, clinics and providers are independent businesses. Any sale, delivery fee or service is between you and them. Directory listings for facilities that have not connected their stock are for location reference only.</p>
      </>
    ),
  },
  {
    id: 'delivery',
    title: '5. Delivery requests',
    body: (
      <p>A delivery request is not an order until the pharmacy confirms it. The pharmacy sets and collects any delivery fee and arranges the driver. Keep your delivery PIN private and give it only to the driver when you receive your medicine.</p>
    ),
  },
  {
    id: 'your-part',
    title: '6. Your responsibilities',
    body: (
      <ul>
        <li>Give accurate information, especially your phone number, location and any symptoms or danger signs.</li>
        <li>Only submit information about another person if you have their permission, or you are their parent, guardian or caregiver.</li>
        <li>Do not misuse the service: no false requests, spam, scraping, attempts to access accounts or data that are not yours, or anything unlawful.</li>
      </ul>
    ),
  },
  {
    id: 'pharmacies',
    title: '7. Pharmacies, clinics and partners',
    body: (
      <>
        <p>If you list a facility on ChekaMeds, you confirm you are authorised to do so, hold the licences your work requires (including with BOMRA and the relevant professional councils), keep your stock and prices accurate, and respond to requests promptly. You are responsible for the patient information you receive through ChekaMeds and must protect it under the law.</p>
        <p>Paid plans, licences and pilots are governed by the written agreement or quote for that service, which takes priority over these terms where they differ.</p>
      </>
    ),
  },
  {
    id: 'ip',
    title: '8. Our content and brand',
    body: (
      <p>The ChekaMeds name, logo, website design and software belong to IBLIM Enterprises (Pty) Ltd. You may use the service for its intended purpose, but you may not copy, resell or reuse our content or data without written permission.</p>
    ),
  },
  {
    id: 'liability',
    title: '9. Liability',
    body: (
      <>
        <p>We work to keep ChekaMeds accurate and available, but it is provided "as is" and may sometimes be unavailable or contain errors.</p>
        <p>To the extent the law allows, we are not liable for losses arising from stock or price information supplied by pharmacies, from the acts of pharmacies, providers or drivers, or from relying on the service instead of professional medical care. Nothing in these terms limits liability that cannot be limited by law, including your rights under Botswana consumer protection law.</p>
      </>
    ),
  },
  {
    id: 'ending',
    title: '10. Suspension and changes',
    body: (
      <p>We may suspend access for anyone who misuses the service. We may change or discontinue features, and update these terms; the date at the top shows the latest version, and continuing to use ChekaMeds means you accept the update.</p>
    ),
  },
  {
    id: 'law',
    title: '11. Governing law and contact',
    body: (
      <>
        <p>These terms are governed by the laws of Botswana, and disputes are subject to the courts of Botswana. We encourage you to contact us first so we can try to resolve any problem quickly.</p>
        <p>Contact: <a href={`mailto:${EMAIL}`}>{EMAIL}</a> · +267 75 560 140 · Plot 54014, Phase 4, Gaborone, Botswana.</p>
      </>
    ),
  },
];

export default function Terms() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms of Use"
      updated={UPDATED}
      intro={<p style={{ margin: 0 }}>The rules for using ChekaMeds, in plain language. Please read section 3: ChekaMeds is not a medical service and is not for emergencies.</p>}
      sections={sections}
      other={{ label: 'Privacy Policy', to: '/privacy' }}
    />
  );
}
