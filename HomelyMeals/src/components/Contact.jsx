export default function Contact() {
  return (
    <section id="contact" className="py-24 bg-[#fff9e9] px-6">
      <div className="max-w-3xl mx-auto text-center">
        {/* Title */}
        <h3 className="text-4xl md:text-5xl font-extrabold text-[#c54218] mb-6">
          Get in Touch
        </h3>
        <div className="w-20 h-1 bg-[#c54218] mx-auto mb-8 rounded-full"></div>

        {/* Subtitle */}
        <p className="text-lg text-[#13271c] mb-12">
          Have questions or want to place a custom order?  
          Fill out the form below 👇
        </p>

        {/* Contact Form */}
        <form
          action="https://formsubmit.co/shahmuttaqa@gmail.com"
          method="POST"
          className="space-y-6 bg-white p-8 rounded-2xl shadow-lg border border-[#f5e9db] text-left"
        >
          {/* Hidden Inputs for FormSubmit */}
          <input type="hidden" name="_captcha" value="false" />
          <input type="hidden" name="_subject" value="New message from HomelyMeals Contact Form" />
          <input type="hidden" name="_template" value="table" />
          <input type="hidden" name="_next" value="https://yourdomain.com/thanks" />

          {/* Name */}
          <div>
            <label className="block text-[#13271c] font-medium mb-2" htmlFor="name">
              Your Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="w-full px-4 py-3 rounded-lg border border-[#e0d6c8] bg-[#fff9e9] text-[#13271c] focus:outline-none focus:ring-2 focus:ring-[#c54218]"
              placeholder="Enter your name"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-[#13271c] font-medium mb-2" htmlFor="email">
              Your Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="w-full px-4 py-3 rounded-lg border border-[#e0d6c8] bg-[#fff9e9] text-[#13271c] focus:outline-none focus:ring-2 focus:ring-[#c54218]"
              placeholder="Enter your email"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-[#13271c] font-medium mb-2" htmlFor="message">
              Your Message
            </label>
            <textarea
              id="message"
              name="message"
              rows="4"
              required
              className="w-full px-4 py-3 rounded-lg border border-[#e0d6c8] bg-[#fff9e9] text-[#13271c] focus:outline-none focus:ring-2 focus:ring-[#c54218]"
              placeholder="Write your message..."
            ></textarea>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-[#c54218] hover:bg-[#a93513] text-white font-semibold px-6 py-3 rounded-lg shadow-md transition"
          >
            Send Message
          </button>
        </form>
      </div>
    </section>
  );
}