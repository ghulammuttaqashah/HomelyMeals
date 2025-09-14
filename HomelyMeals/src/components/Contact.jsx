export default function Contact() {
  return (
    <section id="contact" className="py-20 bg-gray-800 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h3 className="text-4xl font-bold text-green-400 mb-8">Get in Touch</h3>
        <p className="text-gray-300 mb-10">
          Have questions or want to place a custom order? Send us a message below 👇
        </p>

        <form
          action="mailto:shahmuttaqa@gmail.com"
          method="POST"
          encType="text/plain"
          className="space-y-6 bg-gray-900 p-8 rounded-xl shadow-lg text-left"
        >
          <div>
            <label className="block text-gray-300 mb-2" htmlFor="name">
              Your Name
            </label>
            <input
              type="text"
              id="name"
              name="Name"
              required
              className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2" htmlFor="email">
              Your Email
            </label>
            <input
              type="email"
              id="email"
              name="Email"
              required
              className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2" htmlFor="message">
              Your Message
            </label>
            <textarea
              id="message"
              name="Message"
              rows="4"
              required
              className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Write your message..."
            ></textarea>
          </div>

          <button
            type="submit"
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-lg shadow-md transition"
          >
            Send Message
          </button>
        </form>
      </div>
    </section>
  );
}