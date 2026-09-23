import {createContext,useContext,useEffect,useMemo,useState} from 'react';
import {readLanguage,saveLanguage,translateText} from './core.mjs';
import {localizeTree} from './tree.mjs';
import './language.css';
const LanguageContext=createContext(null);
const storage=()=>{try{return window.localStorage;}catch{return null;}};
export function LanguageProvider({children}) {
  const [language,setLanguage]=useState(()=>readLanguage(storage()));
  useEffect(()=>{
    document.documentElement.lang=language==='zh'?'zh-CN':'en';
    saveLanguage(storage(),language);
  },[language]);
  const value=useMemo(()=>({language,setLanguage}),[language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export const useLanguage=()=>useContext(LanguageContext);
export function Localized({children}) {
  const {language}=useLanguage();
  return localizeTree(children,language);
}
export function LanguageToggle({className=''}) {
  const {language,setLanguage}=useLanguage();
  const label=language==='zh'?'Switch to English':'切换为中文';
  return <button type="button" translate="no" className={`language-toggle ${className}`} data-language={language}
    aria-label={label} title={label} onClick={()=>setLanguage(language==='zh'?'en':'zh')}>
    <span lang={language==='zh'?'zh-CN':'en'}>{language==='zh'?'中':'EN'}</span>
  </button>;
}
export {translateText};
