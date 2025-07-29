import React from 'react';
import './Privacy.css';

export default function Privacy() {
  return (
    <div className="privacy-page">
      <div className="privacy-container">
        <header className="privacy-header">
          <h1>The Hive: Our Privacy Covenant</h1>
          <p className="subtitle">A living covenant between you ("the Node") and the collective ("The Hive")</p>
        </header>

        <div className="privacy-content">
          <p>This document is more than a privacy policy; it is a living covenant between you ("the Node") and the collective ("The Hive"). It outlines our shared commitment to data stewardship, transparency, and your personal sovereignty. Our principles are born from the core belief that technology must amplify our humanity, not exploit it. We collect and use data for one purpose: to build a world where every human can thrive (Horizon 3).</p>

          <h2>Our Core Principles of Data Stewardship</h2>
          
          <h3>Purpose-Driven Collection</h3>
          <p>We only gather data that is essential for our collective mission—to connect individuals, coordinate actions, and build a more harmonious and equitable ecosystem. We do not collect data for the sake of collection.</p>
          
          <h3>Radical Transparency</h3>
          <p>You have the right to know what data we hold, why we hold it, and how it is used to serve the collective. This policy is a living document, and any changes will be communicated openly.</p>
          
          <h3>Your Sovereignty</h3>
          <p>You own and control your personal data. You are a sovereign Node in this network, not a product. You decide what you share, with whom, and for how long.</p>
          
          <h3>Collective Benefit, Not Commercial Exploitation</h3>
          <p>We will never sell your personal data. The value of your data is not in its market price, but in its potential to generate insights that benefit the entire Hive.</p>
          
          <h3>Security as a Shared Shield</h3>
          <p>We commit to protecting the data of the collective with robust security measures. In return, we ask you to be a vigilant guardian of your own data and access.</p>

          <h2>The Data We Collect and Why</h2>
          <p>To build the foundations of our ecosystem (Phase 1), we invite you to contribute information. This data helps us map our collective potential and coordinate our efforts.</p>
          
          <h3>Node Profile Data</h3>
          <p><strong>What we collect:</strong> Your name or pseudonym, contact information, skills, passions, and community or organizational affiliations you choose to share.</p>
          <p><strong>Why we collect it:</strong> To help you become a "Node" in The Hive. This allows other members and projects to connect with you based on shared goals and complementary abilities, fostering the "endless interconnection" our ecosystem is built upon.</p>
          
          <h3>Contribution & Vision Data</h3>
          <p><strong>What we collect:</strong> Your responses to surveys, ideas shared in forums, contributions to workshops, and documented patterns from coordination experiments.</p>
          <p><strong>Why we collect it:</strong> This information forms the bedrock of our "Universal Needs Mapping" and helps us collectively define the parameters of Horizon 3. Your voice directly shapes the future we are building.</p>
          
          <h3>Technical & Usage Data</h3>
          <p><strong>What we collect:</strong> Standard technical data such as your IP address, browser type, and interaction patterns with our platform.</p>
          <p><strong>Why we collect it:</strong> To ensure our digital infrastructure is stable, secure, and accessible. Aggregated, anonymized usage data helps us understand which tools are effective and where the system can be improved.</p>

          <h2>A Clear Explanation: How We Use Your Calendar Data</h2>
          <p>We understand that your calendar contains sensitive information about your time, priorities, and life. Access to this data is handled with the utmost care and is designed exclusively to enable one of The Hive's core functions: Micro-Coordination.</p>
          
          <h3>Explicit, Granular Consent</h3>
          <p>The Hive will never access your calendar without your explicit, opt-in permission. You are in complete control. Access is not an all-or-nothing switch. You can grant access:</p>
          <ul>
            <li>To specific individuals or groups ("Nodes").</li>
            <li>For specific projects or "coordination experiments."</li>
            <li>For a limited duration.</li>
          </ul>
          
          <h3>The "Free/Busy" Principle</h3>
          <p>Our primary use for calendar integration is to identify shared availability, not to see the details of your appointments. When you grant access for coordination, The Hive's system will typically only see your "free" or "busy" status, not the title, location, or description of your events. You can choose to share more detail with trusted Nodes if a specific collaboration requires it, but the default is always maximum privacy.</p>
          
          <h3>Purpose Limitation</h3>
          <p>Your calendar data is used for one reason only: to find overlapping free time to facilitate coordination between you and other Nodes you have chosen to collaborate with. The system will suggest optimal meeting times for a group, eliminating the back-and-forth of scheduling.</p>
          
          <h3>No Unsolicited Scanning or Analysis</h3>
          <p>The Hive's AI will not proactively scan your calendar to infer your habits, relationships, or interests. Data is only processed when you or a trusted Node actively initiates a coordination request.</p>
          
          <h3>Aggregated Insights for the Collective</h3>
          <p>We may analyze anonymized and aggregated calendar data to identify broad patterns that help the entire ecosystem. For example, the system might learn that "Nodes in this community are most available for collaboration on Tuesday afternoons," allowing for better planning of Hive-wide events. Your personal identity or specific schedule will never be identifiable in these analyses.</p>

          <h2>How We Share and Disclose Information</h2>
          <p>Your data is shared only to the extent necessary to fulfill the mission of The Hive, and always under your control.</p>
          
          <h3>With Other Nodes</h3>
          <p>The primary purpose of sharing is to connect you with others. Your profile data (skills, interests) is visible to other members to facilitate dialogue and collaboration. You control the visibility of your profile.</p>
          
          <h3>For Collective Intelligence</h3>
          <p>We share anonymized and aggregated data (as described above) to track our "Success Metrics for F1," such as diversity indices and coordination experiment success rates. These insights are for the collective benefit, helping us build a more effective and responsive system.</p>
          
          <h3>With Trusted Service Providers</h3>
          <p>We may partner with third-party companies for essential services like data hosting or communication tools. We select these partners carefully, ensuring their privacy and security principles align with our own.</p>
          
          <h3>For Legal Reasons</h3>
          <p>We may disclose information if required to do so by law, or in the good-faith belief that such action is necessary to protect the rights, property, or safety of The Hive, its members, or the public.</p>

          <h2>Data Retention: The Lifecycle of Your Contribution</h2>
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

          <h2>Your Sovereignty and Choices</h2>
          <p>As a Node in The Hive, you have fundamental rights over your data:</p>
          <ul>
            <li><strong>Right to Access:</strong> You can request a copy of all the personal data we hold about you at any time.</li>
            <li><strong>Right to Rectify:</strong> You can update or correct your personal information through your profile settings.</li>
            <li><strong>Right to Erasure:</strong> You have the right to delete your account and associated personal data, as detailed in our retention policy.</li>
            <li><strong>Right to Restrict Processing:</strong> You can limit how your data is used, for example, by revoking calendar access for a specific project.</li>
          </ul>

          <h2>Changes to This Covenant</h2>
          <p>The Hive is an emergent system, and this covenant will evolve with it. As we move from Horizon 1 to Horizon 2, our collective understanding of privacy and data may deepen. Any significant changes to this policy will be communicated transparently, and where appropriate, decided upon by the collective.</p>

          <h2>How to Contact Us</h2>
          <p>If you have questions, concerns, or ideas about this Privacy Covenant, please reach out to The Hive's Guardians. The Guardians are a rotating group of community members and builders tasked with developing safeguards against the concentration of power and ensuring the ecosystem operates according to its principles</p>
          
          <p><strong>info@thehive.is</strong></p>

          <div className="privacy-footer">
            <p>Welcome to The Hive. Where we are many, and we are one.</p>
          </div>
        </div>
      </div>
    </div>
  );
} 