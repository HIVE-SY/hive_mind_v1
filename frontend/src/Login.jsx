import { useState } from "react";
import { supabase } from './config/supabase.js';
import './login.css';

export default function Login() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const handleMagicLinkLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    
    const email = e.target.email.value;

    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        setMessage(`❌ Error: ${error.message}`);
      } else {
        setMessage("✅ Magic link sent to your email!");
      }
    } catch (err) {
      console.error("Login error:", err);
      setMessage("❌ Request failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-background">
      <div className="login-container">
        <h1 className="login-title">
          <span className="highlight">Hive Mind</span> Login
        </h1>
        
        <form onSubmit={handleMagicLinkLogin} className="login-form">
          <p className="login-subtext">
            Enter your email to receive a sign-in link
          </p>
          <input
            name="email"
            type="email"
            placeholder="Enter your email"
            required
            className="login-input"
          />
          <button type="submit" className="cta-button" disabled={isLoading}>
            {isLoading ? "Sending..." : "Send Magic Link"}
          </button>
        </form>
        
        {message && <p className="login-feedback">{message}</p>}
        
        {/* Legal Links */}
        <div className="legal-links">
          <button 
            className="legal-link" 
            onClick={() => setShowPrivacyModal(true)}
          >
            Privacy Covenant
          </button>
          <span className="legal-separator">•</span>
          <button 
            className="legal-link" 
            onClick={() => setShowTermsModal(true)}
          >
            Terms of Participation
          </button>
        </div>
      </div>

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div className="modal-overlay" onClick={() => setShowPrivacyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Privacy Covenant</h2>
              <button 
                className="modal-close" 
                onClick={() => setShowPrivacyModal(false)}
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" width={20} height={20}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <h2 style={{ color: 'var(--teal-accent)', marginBottom: '1rem' }}>The Hive: Our Privacy Covenant</h2>
              
              <p>This document is more than a privacy policy; it is a living covenant between you ("the Node") and the collective ("The Hive"). It outlines our shared commitment to data stewardship, transparency, and your personal sovereignty. Our principles are born from the core belief that technology must amplify our humanity, not exploit it. We collect and use data for one purpose: to build a world where every human can thrive (Horizon 3).</p>

              <h3>Our Core Principles of Data Stewardship</h3>
              
              <h4>Purpose-Driven Collection</h4>
              <p>We only gather data that is essential for our collective mission—to connect individuals, coordinate actions, and build a more harmonious and equitable ecosystem. We do not collect data for the sake of collection.</p>
              
              <h4>Radical Transparency</h4>
              <p>You have the right to know what data we hold, why we hold it, and how it is used to serve the collective. This policy is a living document, and any changes will be communicated openly.</p>
              
              <h4>Your Sovereignty</h4>
              <p>You own and control your personal data. You are a sovereign Node in this network, not a product. You decide what you share, with whom, and for how long.</p>
              
              <h4>Collective Benefit, Not Commercial Exploitation</h4>
              <p>We will never sell your personal data. The value of your data is not in its market price, but in its potential to generate insights that benefit the entire Hive.</p>
              
              <h4>Security as a Shared Shield</h4>
              <p>We commit to protecting the data of the collective with robust security measures. In return, we ask you to be a vigilant guardian of your own data and access.</p>

              <h3>The Data We Collect and Why</h3>
              <p>To build the foundations of our ecosystem (Phase 1), we invite you to contribute information. This data helps us map our collective potential and coordinate our efforts.</p>
              
              <h4>Node Profile Data</h4>
              <p><strong>What we collect:</strong> Your name or pseudonym, contact information, skills, passions, and community or organizational affiliations you choose to share.</p>
              <p><strong>Why we collect it:</strong> To help you become a "Node" in The Hive. This allows other members and projects to connect with you based on shared goals and complementary abilities, fostering the "endless interconnection" our ecosystem is built upon.</p>
              
              <h4>Contribution & Vision Data</h4>
              <p><strong>What we collect:</strong> Your responses to surveys, ideas shared in forums, contributions to workshops, and documented patterns from coordination experiments.</p>
              <p><strong>Why we collect it:</strong> This information forms the bedrock of our "Universal Needs Mapping" and helps us collectively define the parameters of Horizon 3. Your voice directly shapes the future we are building.</p>
              
              <h4>Technical & Usage Data</h4>
              <p><strong>What we collect:</strong> Standard technical data such as your IP address, browser type, and interaction patterns with our platform.</p>
              <p><strong>Why we collect it:</strong> To ensure our digital infrastructure is stable, secure, and accessible. Aggregated, anonymized usage data helps us understand which tools are effective and where the system can be improved.</p>

              <h3>A Clear Explanation: How We Use Your Calendar Data</h3>
              <p>We understand that your calendar contains sensitive information about your time, priorities, and life. Access to this data is handled with the utmost care and is designed exclusively to enable one of The Hive's core functions: Micro-Coordination.</p>
              
              <h4>Explicit, Granular Consent</h4>
              <p>The Hive will never access your calendar without your explicit, opt-in permission. You are in complete control. Access is not an all-or-nothing switch. You can grant access:</p>
              <ul>
                <li>To specific individuals or groups ("Nodes").</li>
                <li>For specific projects or "coordination experiments."</li>
                <li>For a limited duration.</li>
              </ul>
              
              <h4>The "Free/Busy" Principle</h4>
              <p>Our primary use for calendar integration is to identify shared availability, not to see the details of your appointments. When you grant access for coordination, The Hive's system will typically only see your "free" or "busy" status, not the title, location, or description of your events. You can choose to share more detail with trusted Nodes if a specific collaboration requires it, but the default is always maximum privacy.</p>
              
              <h4>Purpose Limitation</h4>
              <p>Your calendar data is used for one reason only: to find overlapping free time to facilitate coordination between you and other Nodes you have chosen to collaborate with. The system will suggest optimal meeting times for a group, eliminating the back-and-forth of scheduling.</p>
              
              <h4>No Unsolicited Scanning or Analysis</h4>
              <p>The Hive's AI will not proactively scan your calendar to infer your habits, relationships, or interests. Data is only processed when you or a trusted Node actively initiates a coordination request.</p>
              
              <h4>Aggregated Insights for the Collective</h4>
              <p>We may analyze anonymized and aggregated calendar data to identify broad patterns that help the entire ecosystem. For example, the system might learn that "Nodes in this community are most available for collaboration on Tuesday afternoons," allowing for better planning of Hive-wide events. Your personal identity or specific schedule will never be identifiable in these analyses.</p>

              <h3>How We Share and Disclose Information</h3>
              <p>Your data is shared only to the extent necessary to fulfill the mission of The Hive, and always under your control.</p>
              
              <h4>With Other Nodes</h4>
              <p>The primary purpose of sharing is to connect you with others. Your profile data (skills, interests) is visible to other members to facilitate dialogue and collaboration. You control the visibility of your profile.</p>
              
              <h4>For Collective Intelligence</h4>
              <p>We share anonymized and aggregated data (as described above) to track our "Success Metrics for F1," such as diversity indices and coordination experiment success rates. These insights are for the collective benefit, helping us build a more effective and responsive system.</p>
              
              <h4>With Trusted Service Providers</h4>
              <p>We may partner with third-party companies for essential services like data hosting or communication tools. We select these partners carefully, ensuring their privacy and security principles align with our own.</p>
              
              <h4>For Legal Reasons</h4>
              <p>We may disclose information if required to do so by law, or in the good-faith belief that such action is necessary to protect the rights, property, or safety of The Hive, its members, or the public.</p>

              <h3>Data Retention: The Lifecycle of Your Contribution</h3>
              <p>You are a steward of your data's lifecycle within The Hive.</p>
              <ul>
                <li>Your data is retained as long as you remain an active Node in the ecosystem.</li>
                <li>If you choose to leave The Hive, you have three options:</li>
                <ul>
                  <li><strong>Export:</strong> Take your data with you.</li>
                  <li><strong>Anonymize:</strong> Allow your contributions (like survey responses and ideas) to remain as part of the collective intelligence, but with all personal identifiers removed.</li>
                  <li><strong>Delete:</strong> Request the complete and permanent deletion of your personal data from our systems.</li>
                </ul>
              </ul>

              <h3>Your Sovereignty and Choices</h3>
              <p>As a Node in The Hive, you have fundamental rights over your data:</p>
              <ul>
                <li><strong>Right to Access:</strong> You can request a copy of all the personal data we hold about you at any time.</li>
                <li><strong>Right to Rectify:</strong> You can update or correct your personal information through your profile settings.</li>
                <li><strong>Right to Erasure:</strong> You have the right to delete your account and associated personal data, as detailed in our retention policy.</li>
                <li><strong>Right to Restrict Processing:</strong> You can limit how your data is used, for example, by revoking calendar access for a specific project.</li>
              </ul>

              <h3>Changes to This Covenant</h3>
              <p>The Hive is an emergent system, and this covenant will evolve with it. As we move from Horizon 1 to Horizon 2, our collective understanding of privacy and data may deepen. Any significant changes to this policy will be communicated transparently, and where appropriate, decided upon by the collective.</p>

              <h3>How to Contact Us</h3>
              <p>If you have questions, concerns, or ideas about this Privacy Covenant, please reach out to The Hive's Guardians. The Guardians are a rotating group of community members and builders tasked with developing safeguards against the concentration of power and ensuring the ecosystem operates according to its principles.</p>
              
              <p><strong>info@thehive.is</strong></p>

              <div style={{ 
                textAlign: 'center', 
                marginTop: '2rem', 
                padding: '1rem', 
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                fontStyle: 'italic',
                color: 'var(--teal-accent)'
              }}>
                Welcome to The Hive. Where we are many, and we are one.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terms & Conditions Modal */}
      {showTermsModal && (
        <div className="modal-overlay" onClick={() => setShowTermsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Terms of Participation</h2>
              <button 
                className="modal-close" 
                onClick={() => setShowTermsModal(false)}
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" width={20} height={20}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <h2 style={{ color: 'var(--teal-accent)', marginBottom: '1rem' }}>The Hive: Terms of Participation</h2>
              
              <p>Welcome to The Hive. This document outlines our shared understanding of participation in this collective ecosystem. These are not just rules, but the foundational protocols for our "living covenant." By creating an account or otherwise participating in The Hive ecosystem ("the Platform"), you agree to be bound by these Terms of Participation ("Terms").</p>
              
              <p>This agreement is between you ("you," "the Node") and The Hive collective, stewarded by the Guardians and its future foundational entity ("The Hive," "we," "us").</p>

              <h3>1. The Spirit of Our Agreement: A Collective Covenant</h3>
              <p>The Hive is not a traditional service or application. It is a shared infrastructure designed to facilitate coordination, communication, and convergence for the wellbeing of all. Your participation is a conscious act of co-creation. You are both a part of the whole and the whole itself. These Terms are designed to protect the integrity of our shared mission and the sovereignty of every Node within the ecosystem. By joining, you commit to participating in the spirit of building Horizon 3: a balanced, harmonious world where all can flourish.</p>

              <h3>2. Your Role and Responsibilities as a Node (Code of Conduct)</h3>
              <p>As a Node in this ecosystem, your actions ripple outwards. You agree to participate constructively and in good faith. By using the Platform, you commit to the following:</p>
              
              <h4>Cultivate Harmony</h4>
              <p>You will engage in respectful and constructive dialogue. You agree not to engage in harassment, hate speech, threats, intimidation, or discrimination of any kind. We are building a system that honors diversity in all its forms, including but not limited to race, gender, neurotype, culture, and belief.</p>
              
              <h4>Honor Sovereignty</h4>
              <p>You will respect the privacy, data, and autonomy of other Nodes. You will not attempt to access another Node's account or information without their explicit permission.</p>
              
              <h4>Contribute with Integrity</h4>
              <p>You will not misrepresent your identity, skills, or intentions. You will not upload malicious software, spam the network, or use the Platform for illegal activities.</p>
              
              <h4>Uphold Distributed Power</h4>
              <p>You agree not to use the Platform to hoard resources, concentrate power, or exploit other members for personal or commercial gain in a manner that undermines the collective wellbeing. The Hive is designed for generation, not extraction.</p>
              
              <h4>Engage in Good Faith</h4>
              <p>You will participate in coordination experiments and community dialogues with an authentic desire to contribute to the collective mission.</p>

              <h3>3. Your Rights and Sovereignty</h3>
              <p>Your participation is a contribution, not a surrender of your rights. The Hive is designed to empower you.</p>
              
              <h4>Ownership of Your Contributions</h4>
              <p>You retain full ownership of the intellectual property rights in the content you create and share on The Hive (your "Contributions"), such as your writings, designs, and ideas.</p>
              
              <h4>License to the Collective</h4>
              <p>To operate the Platform and fulfill our mission, you grant The Hive a non-exclusive, worldwide, royalty-free, transferable license to use, reproduce, display, and distribute your Contributions within the ecosystem. For example, this allows us to show your profile to other Nodes or feature your ideas in a community forum. This license is for the sole purpose of operating, developing, and promoting the collective project. It ends when you or The Hive terminate your account, though anonymized insights may be retained as described in our Privacy Covenant.</p>
              
              <h4>Right to Participate in Governance</h4>
              <p>As the ecosystem evolves, Nodes will be invited to participate in decisions that shape the Platform's future, in line with our principles of distributed leadership.</p>
              
              <h4>Right to Leave</h4>
              <p>You are free to leave The Hive at any time. Upon termination of your account, you have the right to export your personal data and Contributions, as detailed in our Privacy Covenant.</p>

              <h3>4. The Role and Limits of The Hive Ecosystem</h3>
              <h4>An Evolving, Experimental Platform</h4>
              <p>You acknowledge that The Hive is currently in Phase 1 (F1), a period of building and experimentation. The Platform is provided on an "as-is" and "as-available" basis. We do not offer warranties of any kind and cannot guarantee that the Platform will always be perfect, secure, or available. We are building this together.</p>
              
              <h4>Limitation of Liability</h4>
              <p>To the fullest extent permitted by law, The Hive and its Guardians shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses, resulting from (a) your access to or use of or inability to access or use the Platform; (b) any conduct or content of any third party on the Platform; or (c) unauthorized access, use, or alteration of your transmissions or content. The Hive is an infrastructure for connection; we are not responsible for the interactions between Nodes.</p>

              <h3>5. Conflict Transformation and Account Termination</h3>
              <p>Our goal is to resolve conflict constructively, not to punish.</p>
              
              <h4>Community-Led Resolution</h4>
              <p>Most disagreements should be handled through direct, good-faith dialogue between Nodes.</p>
              
              <h4>Guardian-Facilitated Mediation</h4>
              <p>If a conflict cannot be resolved or a Node is acting in violation of these Terms, the matter may be brought to The Hive's Guardians. The Guardians will facilitate a transparent process aimed at understanding and resolution, not retribution.</p>
              
              <h4>Suspension and Termination</h4>
              <p>Terminating a Node's participation is a last resort, reserved for serious and repeated violations that threaten the health, safety, and integrity of the ecosystem. Such actions include persistent harassment, malicious technical attacks, or clear attempts to exploit the system in violation of its core principles. The decision-making process will be fair and transparent, and the Node in question will be given an opportunity to be heard whenever possible. The Hive reserves the right to suspend or terminate your account if it is determined that your actions pose a fundamental risk to the collective.</p>

              <h3>6. General Provisions</h3>
              <h4>Changes to These Terms</h4>
              <p>This is a living covenant that will evolve with the ecosystem. We will provide notice of any significant changes. Your continued participation after such changes constitutes your acceptance of the new Terms. We will strive to include the community in the evolution of this agreement.</p>
              
              <h4>Governing Law</h4>
              <p>These Terms shall be governed by the laws of the jurisdiction where The Hive Foundation (or its equivalent legal entity) is registered, without regard to its conflict of law provisions.</p>
              
              <h4>Dispute Resolution</h4>
              <p>We are committed to resolving disputes internally through our Conflict Transformation process. Before resorting to formal legal action, you agree to first contact The Hive's Guardians to seek a resolution.</p>

              <h3>7. Contact</h3>
              <p>For any questions about these Terms, please contact The Hive's Guardians.</p>
              
              <p><strong>info@thehive.is</strong></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
