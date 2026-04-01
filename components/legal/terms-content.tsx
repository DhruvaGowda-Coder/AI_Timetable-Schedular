import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import type { LegalSectionDefinition } from "@/components/legal/legal-page-shell";

interface TermsContentProps {
  showTitle?: boolean;
}

export const TERMS_EFFECTIVE_DATE = "April 1, 2026";
export const TERMS_LAST_UPDATED = "April 1, 2026";

export const termsSummary = (
  <>
    <p>
      These Terms and Conditions govern your access to and use of {APP_NAME}, including the public
      website, authenticated dashboard, APIs, exports, billing flows, and shareable timetable
      links.
    </p>
    <p>
      By creating an account, connecting an integration, purchasing a subscription, or otherwise
      using the service, you agree to these terms. If you do not agree, do not use the platform.
    </p>
  </>
);

export const termsSections: LegalSectionDefinition[] = [
  {
    id: "terms-acceptance",
    title: "Acceptance and eligibility",
    content: (
      <>
        <p>
          These terms apply to every visitor, customer, institution, workspace member, or API user
          who accesses the platform. If you use the service on behalf of a school, college,
          department, or other organization, you represent that you have authority to bind that
          organization to these terms.
        </p>
        <p>
          You must provide accurate information, comply with applicable law, and use the platform
          only for legitimate academic, administrative, or internal business purposes.
        </p>
      </>
    ),
  },
  {
    id: "terms-service",
    title: "Description of the service",
    content: (
      <>
        <p>
          {APP_NAME} provides timetable planning and related operational tools, including AI-assisted
          schedule generation, timetable history, analytics, sharing, exports, notifications,
          workspace collaboration, profile management, and subscription billing.
        </p>
        <p>The service may also offer optional features such as:</p>
        <ul>
          <li>Google sign-in and Google Calendar export.</li>
          <li>AI-generated explanations for timetable variants.</li>
          <li>Public share links for timetable viewing.</li>
          <li>Bulk import, white-label export, and team features on supported plans.</li>
        </ul>
        <p>
          We may improve, add, remove, or change features at any time. Some features may depend on
          third-party services or paid plan availability.
        </p>
      </>
    ),
  },
  {
    id: "terms-accounts",
    title: "Accounts, workspaces, and security",
    content: (
      <>
        <p>
          You are responsible for keeping your login credentials secure and for all activity that
          occurs under your account or workspace. Authentication may be provided through Google
          OAuth and, where enabled, credential-based or one-time-password flows.
        </p>
        <ul>
          <li>Keep your account information current and accurate.</li>
          <li>Do not share credentials in a way that bypasses seat or access limits.</li>
          <li>Ensure invited workspace members use the platform in compliance with these terms.</li>
          <li>
            Notify us promptly if you believe your account, workspace, or share links have been
            accessed without authorization.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "terms-billing",
    title: "Subscriptions, billing, and refunds",
    content: (
      <>
        <p>
          The platform may offer both free and paid plans. Paid features are billed in advance on
          the interval you select at checkout.
        </p>
        <ul>
          <li>INR billing may be processed through Razorpay.</li>
          <li>International billing or portal access may be processed through Lemon Squeezy.</li>
          <li>Subscriptions may renew automatically until you cancel the next renewal.</li>
          <li>Taxes, foreign exchange charges, or bank fees may apply depending on your location.</li>
        </ul>
        <p>
          Unless applicable law requires otherwise, subscription charges are generally
          non-refundable after a billing cycle starts, including for partial months, unused time,
          downgrades, or early cancellation. If you cancel, your paid access typically continues
          until the end of the current paid period.
        </p>
        <p>
          We may change pricing or plan packaging in the future. If a change materially affects an
          existing paid subscription, we will aim to provide reasonable advance notice before it
          takes effect for future renewals.
        </p>
      </>
    ),
  },
  {
    id: "terms-use",
    title: "Acceptable use restrictions",
    content: (
      <>
        <p>You agree not to misuse the platform. This includes, without limitation:</p>
        <ul>
          <li>Attempting to gain unauthorized access to accounts, workspaces, or infrastructure.</li>
          <li>Uploading malicious code, spam, fraudulent content, or unlawful material.</li>
          <li>Reverse engineering, decompiling, scraping, or probing the service without permission.</li>
          <li>Interfering with normal operation, rate limits, or plan restrictions.</li>
          <li>
            Sharing or publishing timetable data through public links unless you are authorized to
            disclose that information.
          </li>
          <li>Using the service to infringe the rights of others or violate privacy obligations.</li>
        </ul>
      </>
    ),
  },
  {
    id: "terms-data",
    title: "Data ownership and intellectual property",
    content: (
      <>
        <p>
          You retain ownership of timetable content, scheduling data, and other information you
          submit to the service. You grant us a limited license to host, process, reproduce, and
          display that data only as needed to operate, secure, and improve the platform for you.
        </p>
        <p>
          The software, interface design, branding, algorithms, exports format, documentation, and
          other platform materials remain the property of {APP_NAME} or its licensors and are
          protected by applicable intellectual property laws.
        </p>
        <p>
          Our handling of personal information is described in our{" "}
          <Link href="/privacy" prefetch className="font-medium text-secondary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    id: "terms-integrations",
    title: "AI features, exports, and third-party services",
    content: (
      <>
        <p>
          Timetable generation is an assistive planning tool. You are responsible for reviewing any
          generated timetable, export, share link, or AI explanation before relying on it for
          academic operations.
        </p>
        <ul>
          <li>
            Optional integrations such as Google sign-in, Google Calendar export, payment portals,
            and email delivery are subject to the availability and terms of those providers.
          </li>
          <li>
            If you connect Google Calendar, you agree that our app acts only as a conduit to safely
            export your timetable events, in strict compliance with the Google API Services User Data Policy.
          </li>
          <li>
            If you use AI explanation features, relevant timetable and constraint data may be sent
            to our configured AI provider solely to produce the requested explanation.
          </li>
          <li>
            Share links are accessible to anyone with the URL until they expire or are removed, so
            do not share them for confidential schedules unless you accept that risk.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "terms-termination",
    title: "Availability, suspension, and termination",
    content: (
      <>
        <p>
          We may temporarily suspend, restrict, or terminate access if we believe it is reasonably
          necessary to protect the service, comply with law, investigate misuse, address non-payment,
          or respond to a security incident.
        </p>
        <p>
          We may also modify or discontinue part of the platform, with or without notice, especially
          where a third-party integration changes or a feature is no longer viable.
        </p>
        <p>
          When an account or subscription ends, access to paid features may stop immediately or at
          the end of the current billing period, depending on the reason for termination. We may
          retain limited records as needed for billing, legal compliance, backups, fraud prevention,
          or dispute resolution.
        </p>
      </>
    ),
  },
  {
    id: "terms-liability",
    title: "Disclaimers and limitation of liability",
    content: (
      <>
        <p>
          The platform is provided on an &quot;as is&quot; and &quot;as available&quot; basis. To the fullest
          extent permitted by law, we disclaim warranties of merchantability, fitness for a
          particular purpose, non-infringement, uninterrupted availability, and error-free output.
        </p>
        <p>
          We are not responsible for losses caused by inaccurate input data, institutional policy
          decisions, faculty changes, room changes, internet outages, third-party service failures,
          or your failure to review generated schedules before use.
        </p>
        <p>
          To the extent permitted by law, our total liability for any claim arising out of or
          relating to the service will not exceed the amount you paid to us for the affected paid
          service during the 12 months before the claim arose.
        </p>
      </>
    ),
  },
  {
    id: "terms-law",
    title: "Governing law and contact",
    content: (
      <>
        <p>
          These terms are governed by the laws of India, without regard to conflict of law
          principles. You agree to first contact us in good faith to try to resolve any dispute
          informally.
        </p>
        <p>
          If a dispute cannot be resolved informally, courts located in Karnataka, India may have
          jurisdiction, subject to any non-waivable rights you may have under applicable law.
        </p>
      </>
    ),
  },
];

export const termsContactContent = (
  <>
    <p>
      For legal, billing, or terms-related questions, contact{" "}
      <a href="mailto:dhruvagowda2006@gmail.com">dhruvagowda2006@gmail.com</a>.
    </p>
    <p>Phone / WhatsApp: +91 9686437883</p>
  </>
);

export function TermsContent({ showTitle = true }: TermsContentProps) {
  return (
    <div className="space-y-8 text-sm leading-7 text-brand-text-secondary">
      {showTitle ? (
        <section className="space-y-2">
          <h1 className="border-b border-brand-border pb-2 text-2xl font-bold text-brand-text">
            Terms and Conditions
          </h1>
          <p className="font-medium text-brand-text">Effective date: {TERMS_EFFECTIVE_DATE}</p>
          <p className="font-medium text-brand-text">Last updated: {TERMS_LAST_UPDATED}</p>
        </section>
      ) : null}

      {termsSections.map((section, index) => (
        <section key={section.id} className="space-y-3" id={section.id}>
          <h2 className="text-lg font-semibold text-brand-text">
            {index + 1}. {section.title}
          </h2>
          <div className="space-y-4 [&_a]:font-medium [&_a]:text-secondary [&_a:hover]:underline [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-2">
            {section.content}
          </div>
        </section>
      ))}
    </div>
  );
}
