import ReactGA from 'react-ga4';

const TRACKING_ID = process.env.REACT_APP_GA_TRACKING_ID ;
let initialized = false;

export const initGA = () => {
  if (!TRACKING_ID) {
    console.warn('');
    return;
  }
  
  if (initialized) return;
  
  ReactGA.initialize(TRACKING_ID, {
    gaOptions: {
      anonymizeIp: true,
      cookieFlags: 'SameSite=None;Secure'
    },
    gtagOptions: {
      send_page_view: false // We'll send manually
    }
  });
  
  initialized = true;
  console.log('✅ Google Analytics initialized');
};

export const trackPageView = (path, title) => {
  if (!initialized) return;
  
  ReactGA.send({ 
    hitType: 'pageview', 
    page: path,
    title: title || document.title
  });
  
  console.log('📊 GA Page View:', path);
};

export const trackEvent = (category, action, label, value) => {
  if (!initialized) return;
  
  ReactGA.event({
    category,
    action,
    label,
    value: value ? Math.round(value) : undefined,
  });
  
  console.log('📊 GA Event:', category, action, label);
};

export const trackTiming = (category, variable, value, label) => {
  if (!initialized) return;
  
  ReactGA.event({
    category: 'Performance',
    action: 'timing_complete',
    label: `${category}: ${variable} - ${label}`,
    value: Math.round(value),
  });
};

export const setUserProperties = (userId, properties = {}) => {
  if (!initialized) return;
  
  ReactGA.set({
    userId,
    ...properties
  });
  
  console.log('📊 GA User Properties:', userId);
};
