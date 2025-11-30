export default function GlobalStyles() {
  return (
    <style jsx global>{`
      :root {
        --gradient-royal-indigo: linear-gradient(135deg, #0054B5 0%, #4A46C9 100%);
        --gradient-purple-indigo: linear-gradient(135deg, #6253D8 0%, #2E2B73 100%);
        --gradient-cyan-blue: linear-gradient(135deg, #0085CE 0%, #004E93 100%);
        --gradient-gunmetal-midnight: linear-gradient(135deg, #222222 0%, #000000 100%);
        --gradient-orange-red: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%);
        --gradient-green-teal: linear-gradient(135deg, #4CAF50 0%, #009688 100%);
      }
      
      .font-barlow {
        font-family: 'Barlow', sans-serif;
      }
      
      .font-inter {
        font-family: 'Inter', sans-serif;
      }
      
      .gradient-royal-indigo {
        background: var(--gradient-royal-indigo);
      }
      
      .gradient-purple-indigo {
        background: var(--gradient-purple-indigo);
      }
      
      .gradient-cyan-blue {
        background: var(--gradient-cyan-blue);
      }
      
      .gradient-gunmetal-midnight {
        background: var(--gradient-gunmetal-midnight);
      }
      
      .gradient-orange-red {
        background: var(--gradient-orange-red);
      }
      
      .gradient-green-teal {
        background: var(--gradient-green-teal);
      }
      
      .hover-lift {
        transition: all 0.3s ease;
      }
      
      .hover-lift:hover {
        transform: translateY(-4px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
      }
      
      .nav-transition {
        transition: color 0.14s ease;
      }
      
      .nutrition-scroll {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      
      .nutrition-scroll::-webkit-scrollbar {
        display: none;
      }

      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: .5;
        }
      }
      
      .animate-pulse {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
    `}</style>
  );
}
