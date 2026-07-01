export default function Contact() {
  return (
    <section className="public-page">
      <h1>Talk to a ConnectIQ Advisor</h1>
      <p>Need help choosing internet? Send us your information and we’ll help.</p>

      <form className="contact-form">
        <label>Name</label>
        <input placeholder="Your name" />

        <label>Email</label>
        <input placeholder="Your email" />

        <label>Phone</label>
        <input placeholder="Your phone number" />

        <label>Message</label>
        <textarea placeholder="Tell us what you need" />

        <button type="button">Request Help</button>
      </form>
    </section>
  );
}