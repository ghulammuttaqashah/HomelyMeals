export default function Footer() {
  return (
    <footer className="bg-[#c54218] py-10 text-center">
      {/* Brand */}
      <h2 className="text-white font-extrabold text-3xl mb-3">
        HomelyMeals
      </h2>

      {/* Tagline */}
      <p className="text-[#fff9e9] text-lg mb-6">
        Fresh, hygienic, home-cooked meals delivered to you.
      </p>

   

      {/* Divider */}
      <div className="w-16 h-[2px] bg-white mx-auto mb-4"></div>

      {/* Copyright */}
      <p className="text-sm text-white/80">
        © {new Date().getFullYear()} HomelyMeals. All rights reserved.
      </p>
    </footer>
  );
}