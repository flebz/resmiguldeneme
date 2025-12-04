import React, { useEffect, useState } from 'react';
import { Trophy, X } from 'lucide-react';

interface NotificationToastProps {
  title: string;
  description: string;
  icon: string;
  onClose: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ title, description, icon, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slide in animation
    setTimeout(() => setVisible(true), 10);
    
    // Auto close after 4 seconds
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // Wait for slide out animation
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div 
      className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 w-[90%] max-w-sm transition-all duration-500 ease-in-out ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0'
      }`}
    >
      <div className="bg-white rounded-[18px] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#EDEDED] flex items-center gap-4 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 left-0 w-1 h-full bg-[#2ECC71]"></div>
        
        <div className="w-12 h-12 rounded-full bg-[#2ECC71]/10 flex items-center justify-center text-2xl flex-shrink-0">
          {icon}
        </div>
        
        <div className="flex-1">
          <h4 className="text-[#2ECC71] text-xs font-bold uppercase tracking-wider mb-0.5">BAŞARIM KAZANILDI!</h4>
          <p className="text-[#1A1A1A] font-bold text-sm">{title}</p>
          <p className="text-[#6F6F6F] text-xs">{description}</p>
        </div>

        <button 
          onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
          className="text-[#C5C5C5] hover:text-[#1A1A1A] transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;