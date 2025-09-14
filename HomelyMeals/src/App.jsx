import Header from "./components/Header";
import Hero from "./components/Hero";
import About from "./components/About";
import WhyUs from "./components/WhyUs";
import HowItWorks from "./components/HowItWorks";
import Contact from "./components/Contact";
import Footer from "./components/Footer";

function App() {
  return (
    <div className="bg-gray-900 text-gray-100 font-sans">
      <Header />
      <Hero />
      <About />
      <WhyUs />
      <HowItWorks />
      <Contact />
      <Footer />
    </div>
  );
}

export default App;