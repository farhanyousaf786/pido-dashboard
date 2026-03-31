import React from 'react';

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <span>
        
        {year} Pido Dashboard
      </span>
      <span>
        Crafted with 
        by your dashboard
      </span>
    </footer>
  );
}

export default Footer;
