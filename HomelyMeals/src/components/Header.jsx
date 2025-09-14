import { useState } from "react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 w-full bg-[#fff9e9] shadow-md z-50">
      <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-4">
        {/* Logo */}
        <h1
          className="text-2xl font-bold cursor-pointer text-[#c54218]"
          onClick={() => scrollToSection("hero")}
        >
          HomelyMeals
        </h1>

        {/* Desktop Nav */}
        <nav className="hidden md:flex space-x-8">
          {["Home", "About", "WhyUs", "HowItWorks", "Contact"].map((item) => (
            <button
              key={item}
              onClick={() => scrollToSection(item.toLowerCase())}
              className="text-[#13271c] hover:text-[#c54218] transition"
            >
              {item.replace("WhyUs", "Why Us").replace("HowItWorks", "How It Works")}
            </button>
          ))}
        </nav>

        {/* CTA */}
        <a
          href="https://wa.me/1234567890"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:inline-block bg-[#c54218] hover:bg-[#a93513] text-white px-4 py-2 rounded-lg shadow-md"
        >
          Order on WhatsApp
        </a>

        {/* Mobile menu button */}
        <button
          className="md:hidden text-[#c54218]"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-[#fff9e9] px-6 py-4 space-y-4">
          {["Home", "About", "WhyUs", "HowItWorks", "Contact"].map((item) => (
            <button
              key={item}
              onClick={() => scrollToSection(item.toLowerCase())}
              className="block w-full text-left text-[#13271c] hover:text-[#c54218]"
            >
              {item.replace("WhyUs", "Why Us").replace("HowItWorks", "How It Works")}
            </button>
          ))}
          <a
            href="https://wa.me/1234567890"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-[#c54218] hover:bg-[#a93513] text-white px-4 py-2 rounded-lg text-center"
          >
            Order on WhatsApp
          </a>
        </div>
      )}
    </header>
  );
}