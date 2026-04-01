import { APP_NAME } from "@/lib/constants";
import type { LegalSectionDefinition } from "@/components/legal/legal-page-shell";

export const PRIVACY_EFFECTIVE_DATE = "April 1, 2026";
export const PRIVACY_LAST_UPDATED = "April 1, 2026";

export const privacySummary = (
  <>
    <p>
      {APP_NAME} collects the information needed to authenticate users, generate timetables,
      support workspace collaboration, process subscriptions, and operate exports, analytics, and
      optional integrations.
    </p>
    <p>
      We do not sell personal data. When you intentionally use features such as AI explanations,
      payment checkout, Google Calendar export, or public sharing, the minimum relevant data is
      sent to the service provider needed to complete that action.
    </p>
  </>
);

export const privacySections: LegalSectionDefinition[] = [
  {
    id: "privacy-information",
    title: "Information we collect",
    content: (
      <>
        <p>We may collect the following categories of information:</p>
        <ul>
          <li>
            Account details such as your name, email address, profile image, institution or
            workspace name, and authentication method.
          </li>
          <li>
            Scheduling data you enter or upload, including subjects, rooms, faculty assignments,
            slot timings, timetable variants, templates, analytics snapshots, and export
            preferences.
          </li>
          <li>
            Billing and subscription records such as your selected plan, billing interval, payment
            provider, transaction identifiers, and subscription status.
          </li>
          <li>
            Technical and usage data such as browser type, approximate device information, error
            logs, page usage, and in-product activity required to keep the platform secure and
            reliable.
          </li>
          <li>
            Integration data when you connect third-party services, such as Google account details
            required for sign-in or Google Calendar export.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "privacy-use",
    title: "How we use information",
    content: (
      <>
        <p>We use collected information to operate and improve the platform, including to:</p>
        <ul>
          <li>Authenticate users and secure accounts or workspaces.</li>
          <li>Generate timetable variants, save history, and provide exports or share links.</li>
          <li>Process subscription upgrades, renewals, invoices, and billing support requests.</li>
          <li>Send transactional emails such as login, invite, OTP, or account-related notices.</li>
          <li>Provide analytics, onboarding, notifications, and workspace collaboration tools.</li>
          <li>Investigate abuse, diagnose failures, and protect the service and its users.</li>
          <li>
            Generate AI explanations when you request that feature. The core timetable generation
            engine itself runs inside this application and is not outsourced to a third-party LLM.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "privacy-sharing",
    title: "When we share information",
    content: (
      <>
        <p>We do not sell or rent your personal information. We may share information with:</p>
        <ul>
          <li>
            Infrastructure and database providers used to host application data and authentication
            records, including Firebase and related Google Cloud services.
          </li>
          <li>
            Payment providers, including Razorpay for INR billing and Lemon Squeezy for
            international checkout or customer portal flows.
          </li>
          <li>
            Google services when you sign in with Google or export a timetable to Google Calendar.
          </li>
          <li>
            Email delivery providers configured through our SMTP setup when we send OTP or service
            emails.
          </li>
          <li>
            Groq, only when you use the AI explanation feature and relevant timetable and
            constraint data must be processed to generate the explanation.
          </li>
          <li>
            Law enforcement, regulators, courts, or professional advisers when disclosure is
            reasonably necessary to comply with law, enforce our terms, or protect rights and
            safety.
          </li>
          <li>
            A successor entity in the event of a merger, acquisition, or asset transfer, subject
            to applicable law.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "privacy-google",
    title: "Google API Services Usage",
    content: (
      <>
        <p>
          {APP_NAME}&apos;s use and transfer to any other app of information received from Google APIs will
          adhere to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
        <p>Specifically, when you connect your Google Calendar:</p>
        <ul>
          <li>We only request permission to safely write timetable events to your calendar.</li>
          <li>We do not read, scrape, or store your existing personal calendar events.</li>
          <li>
            We do not use Google user data to develop, improve, or train generalized AI or machine
            learning models.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "privacy-cookies",
    title: "Cookies, browser storage, and public sharing",
    content: (
      <>
        <p>
          The platform uses cookies and browser storage for essential product behavior, including
          maintaining authenticated sessions, remembering the selected workspace, storing local
          drafts, and caching analytics or billing state for performance.
        </p>
        <p>
          If you create a share link, timetable data included in that link can be accessed by
          anyone with the URL until the link expires. Share links in this codebase are configured
          to expire after 30 days unless the implementation is changed in a future release.
        </p>
        <p>
          You can clear cookies, local storage, and session storage through your browser, but doing
          so may sign you out, remove saved drafts, or reset app preferences.
        </p>
      </>
    ),
  },
  {
    id: "privacy-security",
    title: "Retention and security",
    content: (
      <>
        <p>
          We use reasonable administrative, technical, and organizational safeguards to protect the
          data we control. That includes authenticated access controls, provider-level security
          measures, and separation between public and private application routes.
        </p>
        <p>
          We keep information for as long as it is needed to operate the service, maintain account
          history, resolve disputes, meet legal obligations, or protect against abuse. Some data
          may remain in backups, logs, or billing records for a limited period after you stop using
          the service.
        </p>
        <p>
          No online service can guarantee absolute security, so you should avoid uploading
          information you are not comfortable storing in a cloud-based scheduling platform.
        </p>
      </>
    ),
  },
  {
    id: "privacy-rights",
    title: "Your choices and rights",
    content: (
      <>
        <p>
          Subject to applicable law, you may have the right to request access to, correction of,
          export of, or deletion of your personal data.
        </p>
        <p>You may also choose to:</p>
        <ul>
          <li>Disconnect optional integrations such as Google Calendar.</li>
          <li>Cancel paid subscriptions before the next renewal date.</li>
          <li>Disable or clear browser storage on your own device.</li>
          <li>Contact us to request account closure or ask privacy-related questions.</li>
        </ul>
        <p>
          We may need to verify your identity before acting on a request, and we may retain
          information where required by law or necessary for legitimate business purposes.
        </p>
      </>
    ),
  },
  {
    id: "privacy-children",
    title: "Children's privacy",
    content: (
      <>
        <p>
          {APP_NAME} is intended for schools, colleges, universities, administrators, faculty, and
          other users acting in an educational or organizational context. It is not designed for
          direct use by young children.
        </p>
        <p>
          If you believe a child has submitted personal information to the platform without proper
          authorization, contact us and we will review the request and take appropriate action.
        </p>
      </>
    ),
  },
  {
    id: "privacy-changes",
    title: "Changes to this policy",
    content: (
      <>
        <p>
          We may update this Privacy Policy from time to time to reflect product changes, new
          integrations, legal requirements, or operational updates. When we do, we will revise the
          last updated date on this page.
        </p>
        <p>
          Material changes may also be communicated inside the app or by email when appropriate.
          Your continued use of the platform after an updated policy becomes effective means the
          revised policy will apply going forward.
        </p>
      </>
    ),
  },
];

export const privacyContactContent = (
  <>
    <p>
      For privacy questions, data requests, or account-related concerns, contact us at{" "}
      <a href="mailto:dhruvagowda2006@gmail.com">dhruvagowda2006@gmail.com</a>.
    </p>
    <p>
      Please include enough detail for us to identify your account or workspace and describe the
      request you want us to review.
    </p>
  </>
);

interface PrivacyContentProps {
  showTitle?: boolean;
}

export function PrivacyContent({ showTitle = true }: PrivacyContentProps) {
  return (
    <div className="space-y-8 text-sm leading-7 text-brand-text-secondary">
      {showTitle ? (
        <section className="space-y-2">
          <h1 className="border-b border-brand-border pb-2 text-2xl font-bold text-brand-text">
            Privacy Policy
          </h1>
          <p className="font-medium text-brand-text">Effective date: {PRIVACY_EFFECTIVE_DATE}</p>
          <p className="font-medium text-brand-text">Last updated: {PRIVACY_LAST_UPDATED}</p>
        </section>
      ) : null}

      {privacySections.map((section, index) => (
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
