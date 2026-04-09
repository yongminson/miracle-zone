"use client";

import Script from 'next/script';

export default function Analytics() {
  return (
    <>
      {/* 🚀 1. Google Analytics 4 (GA4) */}
      <Script 
        src="https://www.googletagmanager.com/gtag/js?id=G-F84WLFC2B4" 
        strategy="afterInteractive" 
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-F84WLFC2B4');
        `}
      </Script>

      {/* 🚀 2. Microsoft Clarity */}
      <Script id="clarity-script" strategy="afterInteractive">
        {`
          (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "w90kvp9kme");
        `}
      </Script>
    </>
  );
}