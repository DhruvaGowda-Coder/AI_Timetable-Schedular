/* eslint-disable react/no-unescaped-entities */
import Link from "next/link";

interface TermsContentProps {
  showTitle?: boolean;
}

export const TERMS_LAST_UPDATED = "February 17, 2026";

export function TermsContent({ showTitle = true }: TermsContentProps) {
  return (
    <div className="space-y-6 text-sm leading-6 text-brand-text-secondary">
      {showTitle ? (
        <section className="space-y-2">
          <h1 className="border-b border-brand-border pb-2 text-2xl font-bold text-brand-text">
            Terms and Conditions of Use
          </h1>
          <p className="font-medium text-brand-text">Last Updated: {TERMS_LAST_UPDATED}</p>
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-brand-text">1. Introduction</h2>
        <p>
          Welcome to <strong>Schedulr AI</strong> ("Company", "we", "our", "us"). These Terms and
          Conditions ("Terms") govern your access to and use of the Schedulr AI website, platform,
          and services (collectively, the "Service").
        </p>
        <p>
          By accessing or using our Service, you agree to be bound by these Terms. If you do not
          agree to these Terms, you may not access or use the Service.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-brand-text">2. Definitions</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>"User", "you", "your"</strong> means any individual or entity that registers
            for, accesses, or uses the Service.
          </li>
          <li>
            <strong>"Service"</strong> means the Schedulr AI web application, including all
            features such as timetable generation, analytics, emergency rescheduling,
            notifications, calendar events, and related functionalities.
          </li>
          <li>
            <strong>"Subscription"</strong> means the recurring payment plan you select (Free,
            Pro, Department, or Institution) as described in Section 5.
          </li>
          <li>
            <strong>"Content"</strong> means any data, information, or materials you submit to the
            Service.
          </li>
          <li>
            <strong>"Historical Analytics"</strong> means access to analytics data for all
            previously generated timetable variants, available to Pro subscribers and above.
          </li>
          <li>
            <strong>"Emergency Rescheduling"</strong> means the feature that allows on-the-fly
            adjustment of timetables in response to unexpected disruptions, available to
            Pro subscribers and above.
          </li>
          <li>
            <strong>"Advanced Constraints"</strong> means additional scheduling rules such as
            faculty availability, per-subject class frequency, room type requirements, workload
            limits, batch constraints, and other fine-grained controls available in all plans.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-brand-text">3. Service Description</h2>
        <p>
          Schedulr AI is an advanced university timetable scheduling platform that uses artificial
          intelligence (genetic algorithms) to automate timetable generation, optimize classroom
          usage, resolve faculty/class conflicts, and provide real-time analytics and rescheduling
          capabilities.
        </p>
        <p>The Service includes:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>AI-powered timetable generation with variant options</li>
          <li>Constraint management (subjects, faculty, rooms, time slots, breaks)</li>
          <li>
            Advanced constraints (faculty availability, subject frequency, room requirements,
            workload limits, batch rules, etc.) in all plans
          </li>
          <li>Bulk import via Excel (Pro plans and above)</li>
          <li>Interactive timetable preview and editing</li>
          <li>Analytics dashboards (faculty workload, room utilization, etc.)</li>
          <li>Historical analytics (Pro plans and above)</li>
          <li>Emergency rescheduling engine (Pro plans and above)</li>
          <li>Calendar integration and event management</li>
          <li>Notification system</li>
          <li>Multi-format export (PDF, Excel, bulk ZIP for Pro plans and above)</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-brand-text">4. Account Registration and Security</h2>
        <h3 className="text-base font-semibold text-brand-text">4.1 Account Creation</h3>
        <p>To use the Service, you must register for an account. You may register via:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Email and password (with OTP verification)</li>
          <li>Google OAuth</li>
        </ul>
        <h3 className="text-base font-semibold text-brand-text">4.2 Account Responsibilities</h3>
        <p>You are responsible for:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Maintaining the confidentiality of your login credentials.</li>
          <li>All activities that occur under your account.</li>
          <li>Providing accurate and complete information.</li>
          <li>Notifying us immediately of any unauthorized use.</li>
        </ul>
        <h3 className="text-base font-semibold text-brand-text">4.3 Age Requirement</h3>
        <p>
          You must be at least 18 years old to use the Service. If you are under 18, you may only
          use the Service with the involvement of a parent or guardian.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-brand-text">5. Subscription Plans and Features</h2>
        <p>Schedulr AI offers three subscription tiers:</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse border border-brand-border text-left text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="border border-brand-border px-3 py-2 font-semibold text-brand-text">
                  Feature
                </th>
                <th className="border border-brand-border px-3 py-2 font-semibold text-brand-text">
                  Free
                </th>
                <th className="border border-brand-border px-3 py-2 font-semibold text-brand-text">
                  Pro
                </th>
                <th className="border border-brand-border px-3 py-2 font-semibold text-brand-text">
                  Department
                </th>
                <th className="border border-brand-border px-3 py-2 font-semibold text-brand-text">
                  Institution
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-brand-border px-3 py-2 font-medium text-brand-text">
                  Variants per generation
                </td>
                <td className="border border-brand-border px-3 py-2">3</td>
                <td className="border border-brand-border px-3 py-2">Unlimited</td>
                <td className="border border-brand-border px-3 py-2">Unlimited</td>
                <td className="border border-brand-border px-3 py-2">Unlimited</td>
              </tr>
              <tr>
                <td className="border border-brand-border px-3 py-2 font-medium text-brand-text">
                  PDF & Excel Export
                </td>
                <td className="border border-brand-border px-3 py-2">Yes (Watermarked PDF)</td>
                <td className="border border-brand-border px-3 py-2">Yes (No Watermark)</td>
                <td className="border border-brand-border px-3 py-2">Yes + Bulk</td>
                <td className="border border-brand-border px-3 py-2">Yes + White Label branding</td>
              </tr>
              <tr>
                <td className="border border-brand-border px-3 py-2 font-medium text-brand-text">
                  Admin Seats
                </td>
                <td className="border border-brand-border px-3 py-2">1</td>
                <td className="border border-brand-border px-3 py-2">1</td>
                <td className="border border-brand-border px-3 py-2">5</td>
                <td className="border border-brand-border px-3 py-2">Unlimited</td>
              </tr>
              <tr>
                <td className="border border-brand-border px-3 py-2 font-medium text-brand-text">
                  Pro Features (AI Explanations, Bulk Generation, History)
                </td>
                <td className="border border-brand-border px-3 py-2">No</td>
                <td className="border border-brand-border px-3 py-2">Yes</td>
                <td className="border border-brand-border px-3 py-2">Yes</td>
                <td className="border border-brand-border px-3 py-2">Yes</td>
              </tr>
              <tr>
                <td className="border border-brand-border px-3 py-2 font-medium text-brand-text">
                  Support
                </td>
                <td className="border border-brand-border px-3 py-2">Standard (Community)</td>
                <td className="border border-brand-border px-3 py-2">Standard (24h)</td>
                <td className="border border-brand-border px-3 py-2">Priority (12h)</td>
                <td className="border border-brand-border px-3 py-2">Dedicated (4h)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="font-semibold text-brand-text">Pricing:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Free Plan:</strong> INR 0 / USD 0 per month.
          </li>
          <li>
            <strong>Pro Plan:</strong> INR 599 / USD 14.99 per month, or INR 5,999 / USD 149.99
            per year (saving approximately 17%).
          </li>
          <li>
            <strong>Department Plan:</strong> INR 1,499 / USD 39.99 per month, or INR 14,999 / USD 399.99
            per year (saving approximately 17%).
          </li>
          <li>
            <strong>Institution Plan:</strong> Custom pricing. Contact our sales team for a quote.
          </li>
        </ul>
        <p>
          All paid plans are billed in advance on a monthly or annual basis as selected. There is{" "}
          <strong>no free trial</strong> for paid plans; users may start with the Free Plan and
          upgrade at any time.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-brand-text">6. Payment Terms</h2>
        <h3 className="text-base font-semibold text-brand-text">6.1 Billing Cycle</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Free Plan:</strong> No payment required.
          </li>
          <li>
            <strong>Paid Plans:</strong> Billed monthly or annually based on your selection at
            checkout. All fees are due in advance and are non-refundable as detailed in Section 7.
          </li>
        </ul>
        <h3 className="text-base font-semibold text-brand-text">6.2 Payment Processing</h3>
        <p>
          We use Stripe as our third-party payment processor. By providing payment information,
          you agree to Stripe&apos;s terms and conditions. We do not store your full payment
          details on our servers.
        </p>
        <h3 className="text-base font-semibold text-brand-text">6.3 Price Changes</h3>
        <p>
          We reserve the right to modify subscription fees with 30 days&apos; written notice.
          Continued use of the Service after the fee change constitutes acceptance of the new
          pricing.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-brand-text">7. Refund and Cancellation Policy</h2>
        <p>
          Paid subscriptions are non-refundable. We do not provide refunds or credits for partial
          billing periods, unused time, downgrades, or cancellations.
        </p>
        <p>
          You may cancel at any time, and cancellation takes effect at the end of your current
          billing period. No partial refunds are provided for the remaining days in the cycle.
        </p>
        <h3 className="text-base font-semibold text-brand-text">7.1 Scope</h3>
        <p>The non-refundable policy applies to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Monthly subscription fees.</li>
          <li>Annual subscription fees (full amount).</li>
          <li>Any partial or unused portion of a subscription.</li>
          <li>Upgrade or downgrade fee differentials.</li>
        </ul>
        <h3 className="text-base font-semibold text-brand-text">7.2 Legal Exceptions</h3>
        <p>
          The only exceptions to this policy are where required by applicable consumer protection
          laws in your jurisdiction. In such cases, we will comply with legal requirements.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-brand-text">8. Intellectual Property Rights</h2>
        <h3 className="text-base font-semibold text-brand-text">8.1 Our Intellectual Property</h3>
        <p>
          The Service, including all content, features, functionality, source code, databases, and
          AI algorithms (including our genetic algorithm engine), is owned by Schedulr AI and
          protected by international copyright, trademark, and other intellectual property laws.
        </p>
        <h3 className="text-base font-semibold text-brand-text">8.2 License to Use</h3>
        <p>
          Subject to these Terms, we grant you a limited, non-exclusive, non-transferable,
          revocable license to access and use the Service for your internal business or educational
          purposes.
        </p>
        <h3 className="text-base font-semibold text-brand-text">8.3 Restrictions</h3>
        <p>You may not:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Copy, modify, or create derivative works of the Service.</li>
          <li>Reverse engineer, decompile, or attempt to extract our source code.</li>
          <li>Rent, lease, loan, sell, or sublicense the Service.</li>
          <li>Remove any proprietary notices or watermarks (unless authorized by your plan).</li>
          <li>Use the Service to develop a competing product.</li>
        </ul>
        <h3 className="text-base font-semibold text-brand-text">8.4 Your Content</h3>
        <p>
          You retain all rights to the data and content you submit to the Service. By submitting
          content, you grant us a license to use, store, and process it solely to provide the
          Service to you.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-brand-text">9. User Obligations and Acceptable Use</h2>
        <p>You agree NOT to use the Service to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Violate any applicable laws or regulations.</li>
          <li>Infringe upon the rights of others.</li>
          <li>Transmit harmful code, viruses, or malware.</li>
          <li>Interfere with the integrity or performance of the Service.</li>
          <li>Attempt to gain unauthorized access to our systems.</li>
          <li>Use the Service for any unlawful purpose.</li>
          <li>Upload false or misleading information.</li>
          <li>Harass, abuse, or harm others.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-brand-text">10. Data Privacy and Security</h2>
        <p>
          Your privacy is important to us. Our collection and use of personal information is
          governed by our{" "}
          <Link href="/privacy" prefetch className="font-medium text-secondary hover:underline">
            Privacy Policy
          </Link>
          , which is incorporated into these Terms by reference.
        </p>
        <p>
          We implement reasonable security measures to protect your data. However, no method of
          transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-brand-text">
          11. Service Availability and Modifications
        </h2>
        <h3 className="text-base font-semibold text-brand-text">11.1 Service Availability</h3>
        <p>
          We strive to maintain the Service but cannot guarantee uninterrupted access. The Service
          may be temporarily unavailable due to:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Scheduled maintenance.</li>
          <li>Updates or upgrades.</li>
          <li>Circumstances beyond our control (force majeure).</li>
        </ul>
        <h3 className="text-base font-semibold text-brand-text">11.2 Modifications to Service</h3>
        <p>
          We reserve the right to modify, suspend, or discontinue any part of the Service at any
          time without notice. We will not be liable to you for any such modification.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-brand-text">12. Termination</h2>
        <h3 className="text-base font-semibold text-brand-text">12.1 Termination by You</h3>
        <p>You may terminate your account at any time by:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Cancelling your subscription through account settings.</li>
          <li>Contacting us to request account deletion.</li>
        </ul>
        <h3 className="text-base font-semibold text-brand-text">12.2 Termination by Us</h3>
        <p>We may suspend or terminate your access to the Service immediately, without prior notice, if:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>You breach these Terms.</li>
          <li>We suspect fraudulent or illegal activity.</li>
          <li>You fail to pay applicable fees.</li>
          <li>Required by law.</li>
        </ul>
        <h3 className="text-base font-semibold text-brand-text">12.3 Effect of Termination</h3>
        <p>Upon termination:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Your access to the Service ceases immediately.</li>
          <li>We may delete your data, subject to any legal retention requirements.</li>
          <li>
            <strong>All fees paid are non-refundable.</strong>
          </li>
          <li>Any outstanding fees become immediately due.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-brand-text">13. Disclaimer of Warranties</h2>
        <p className="font-semibold uppercase text-brand-text">
          THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
          EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL
          WARRANTIES, INCLUDING:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>MERCHANTABILITY.</li>
          <li>FITNESS FOR A PARTICULAR PURPOSE.</li>
          <li>NON-INFRINGEMENT.</li>
          <li>ACCURACY OR COMPLETENESS.</li>
          <li>UNINTERRUPTED OR ERROR-FREE OPERATION.</li>
        </ul>
        <p>
          We do not warrant that the AI-generated timetables will be free of all conflicts or that
          the Service will meet your specific requirements.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-brand-text">14. Limitation of Liability</h2>
        <p className="font-semibold uppercase text-brand-text">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL SCHEDULR AI BE LIABLE FOR:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.</li>
          <li>LOSS OF PROFITS, REVENUE, DATA, OR GOODWILL.</li>
          <li>DAMAGES RELATED TO YOUR USE OF OR INABILITY TO USE THE SERVICE.</li>
          <li>UNAUTHORIZED ACCESS TO OR ALTERATION OF YOUR DATA.</li>
        </ul>
        <p>
          OUR TOTAL LIABILITY TO YOU SHALL NOT EXCEED THE AMOUNT YOU PAID US DURING THE TWELVE
          (12) MONTHS PRIOR TO THE EVENT GIVING RISE TO LIABILITY.
        </p>
        <p>
          Some jurisdictions do not allow the exclusion of certain warranties or limitation of
          liability, so some of the above limitations may not apply to you.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-brand-text">15. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless Schedulr AI, its officers, directors,
          employees, and agents from any claims, damages, liabilities, and expenses arising out
          of:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Your use of the Service.</li>
          <li>Your violation of these Terms.</li>
          <li>Your violation of any third-party rights.</li>
          <li>Your content submitted to the Service.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-brand-text">
          16. Governing Law and Dispute Resolution
        </h2>
        <h3 className="text-base font-semibold text-brand-text">16.1 Governing Law</h3>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of India,
          without regard to its conflict of law provisions.
        </p>
        <h3 className="text-base font-semibold text-brand-text">16.2 Dispute Resolution</h3>
        <p>
          Any disputes arising under these Terms shall be resolved through binding arbitration in
          accordance with the rules of the Indian Arbitration and Conciliation Act. Each party
          shall bear its own costs.
        </p>
        <h3 className="text-base font-semibold text-brand-text">16.3 Class Action Waiver</h3>
        <p>
          You agree to resolve disputes on an individual basis and waive the right to participate
          in any class action lawsuit.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-brand-text">17. Changes to Terms</h2>
        <p>
          We reserve the right to modify these Terms at any time. Material changes will be posted
          on this page with an updated "Last Updated" date. We may notify users of significant
          changes via email or through the Service. Continued use of the Service after changes
          constitutes acceptance of the revised Terms.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-brand-text">18. General Provisions</h2>
        <h3 className="text-base font-semibold text-brand-text">18.1 Entire Agreement</h3>
        <p>
          These Terms, together with our Privacy Policy, constitute the entire agreement between
          you and Schedulr AI regarding the Service.
        </p>
        <h3 className="text-base font-semibold text-brand-text">18.2 Severability</h3>
        <p>
          If any provision of these Terms is held to be unenforceable, the remaining provisions
          shall remain in full force and effect.
        </p>
        <h3 className="text-base font-semibold text-brand-text">18.3 Waiver</h3>
        <p>
          Our failure to enforce any right or provision shall not constitute a waiver of such right
          or provision.
        </p>
        <h3 className="text-base font-semibold text-brand-text">18.4 Assignment</h3>
        <p>
          You may not assign these Terms without our prior written consent. We may assign these
          Terms without restriction.
        </p>
        <h3 className="text-base font-semibold text-brand-text">18.5 Contact Information</h3>
        <p>If you have any questions about these Terms, please contact us at:</p>
        <address className="not-italic">
          <strong className="text-brand-text">Schedulr AI</strong>
          <br />
          Email: dhruvagowda2006@gmail.com
          <br />
          Phone/WhatsApp: +91 9686437883
          <br />
          Office Hours: Monday - Friday, 9:00 AM - 6:00 PM IST
        </address>
      </section>

      <hr className="border-brand-border" />

      <section className="space-y-2 text-center text-xs">
        <p className="font-semibold text-brand-text">
          By using Schedulr AI, you acknowledge that you have read, understood, and agree to be
          bound by these Terms and Conditions, including the no-refund policy outlined in Section 7.
        </p>
        <p>&copy; 2026 Schedulr AI. All rights reserved.</p>
      </section>
    </div>
  );
}


