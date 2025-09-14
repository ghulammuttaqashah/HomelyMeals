export default function About() {
  return (
    <section id="about" className="py-24 bg-[#fff9e9]">
      <div className="max-w-5xl mx-auto px-6 text-center">
        {/* Title */}
        <h3 className="text-4xl md:text-5xl font-extrabold text-[#c54218] mb-8">
          About HomelyMeals
        </h3>

        {/* Subtitle / Divider */}
        <div className="w-20 h-1 bg-[#c54218] mx-auto mb-8 rounded-full"></div>

        {/* Text */}
        <p className="text-lg md:text-xl text-[#13271c] leading-relaxed max-w-3xl mx-auto">
          We connect skilled home cooks with students, professionals, and families
          looking for <span className="font-semibold">hygienic, affordable, and tasty meals</span>. 
          <br className="hidden md:block" />
          Say goodbye to oily, repetitive outside meals — 
          <span className="italic"> experience real home taste, every day.</span>
        </p>
      </div>
    </section>
  );
}