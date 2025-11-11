import React from 'react';
import { Loader, CheckCircle, AlertCircle } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// CARD COMPONENTS
// ═══════════════════════════════════════════════════════════════════

export const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-lg border border-slate-200 transition-all duration-300 hover:shadow-xl ${className}`}>
    {children}
  </div>
);

export const CardHeader = ({ children, className = "" }) => (
  <div className={`px-6 py-4 border-b border-slate-200 ${className}`}>
    {children}
  </div>
);

export const CardBody = ({ children, className = "" }) => (
  <div className={`p-6 ${className}`}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = "" }) => (
  <div className={`px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl ${className}`}>
    {children}
  </div>
);

// ═══════════════════════════════════════════════════════════════════
// BUTTON COMPONENTS
// ═══════════════════════════════════════════════════════════════════

export const Button = ({
  variant = "primary",
  size = "md",
  children,
  disabled = false,
  loading = false,
  icon: Icon = null,
  className = "",
  ...props
}) => {
  const baseStyles = "font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm rounded-lg",
    md: "px-4 py-2.5 text-base rounded-lg",
    lg: "px-6 py-3 text-lg rounded-xl",
  };

  const variantStyles = {
    primary: "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 shadow-lg hover:shadow-xl",
    secondary: "bg-slate-200 text-slate-800 hover:bg-slate-300",
    success: "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-lg",
    danger: "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg",
    outline: "border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50",
    ghost: "text-slate-700 hover:bg-slate-100",
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader className="animate-spin" size={18} />}
      {Icon && !loading && <Icon size={18} />}
      {children}
    </button>
  );
};

// ═══════════════════════════════════════════════════════════════════
// BADGE COMPONENTS
// ═══════════════════════════════════════════════════════════════════

export const Badge = ({ variant = "primary", children }) => {
  const variantStyles = {
    primary: "bg-indigo-100 text-indigo-800",
    success: "bg-emerald-100 text-emerald-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-800",
    info: "bg-blue-100 text-blue-800",
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${variantStyles[variant]}`}>
      {children}
    </span>
  );
};

// ═══════════════════════════════════════════════════════════════════
// ALERT COMPONENTS
// ═══════════════════════════════════════════════════════════════════

export const Alert = ({ variant = "info", title, message, onClose }) => {
  const variantStyles = {
    success: { bg: "bg-emerald-50", border: "border-emerald-200", icon: "text-emerald-600", text: "text-emerald-800" },
    error: { bg: "bg-red-50", border: "border-red-200", icon: "text-red-600", text: "text-red-800" },
    warning: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-600", text: "text-amber-800" },
    info: { bg: "bg-blue-50", border: "border-blue-200", icon: "text-blue-600", text: "text-blue-800" },
  };

  const styles = variantStyles[variant];

  return (
    <div className={`${styles.bg} ${styles.border} border rounded-lg p-4 mb-4`}>
      <div className="flex items-start gap-3">
        <div className={`${styles.icon} mt-0.5`}>
          {variant === 'success' && <CheckCircle size={20} />}
          {variant === 'error' && <AlertCircle size={20} />}
          {variant === 'warning' && <AlertCircle size={20} />}
          {variant === 'info' && <AlertCircle size={20} />}
        </div>
        <div className="flex-1">
          {title && <p className={`font-semibold ${styles.text}`}>{title}</p>}
          {message && <p className={`text-sm ${styles.text}`}>{message}</p>}
        </div>
        {onClose && (
          <button onClick={onClose} className={`${styles.text} hover:opacity-70`}>
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// INPUT COMPONENTS
// ═══════════════════════════════════════════════════════════════════

export const Input = ({ label, error, ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>}
    <input
      {...props}
      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg font-medium bg-white text-slate-900 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
    />
    {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
  </div>
);

export const Select = ({ label, options, error, ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>}
    <select
      {...props}
      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg font-medium bg-white text-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
    >
      <option value="">Selecione uma opção</option>
      {options && options.map((opt, idx) => (
        <option key={idx} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
  </div>
);

// ═══════════════════════════════════════════════════════════════════
// LOADING & EMPTY STATES
// ═══════════════════════════════════════════════════════════════════

export const LoadingSpinner = ({ size = 40, message = "Carregando..." }) => (
  <div className="flex flex-col items-center justify-center py-12">
    <Loader className="animate-spin text-indigo-600 mb-4" size={size} />
    <p className="text-slate-600 font-medium">{message}</p>
  </div>
);

export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="text-center py-12">
    {Icon && <Icon className="mx-auto mb-4 text-slate-400" size={48} />}
    <p className="text-lg font-semibold text-slate-900 mb-2">{title}</p>
    <p className="text-slate-500 mb-6">{description}</p>
    {action && action}
  </div>
);

// ═══════════════════════════════════════════════════════════════════
// HEADER COMPONENTS
// ═══════════════════════════════════════════════════════════════════

export const PageHeader = ({ title, subtitle, action }) => (
  <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-8 rounded-2xl shadow-xl mb-8">
    <h1 className="text-3xl md:text-4xl font-bold mb-2">{title}</h1>
    {subtitle && <p className="text-indigo-100 text-lg">{subtitle}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const SectionHeader = ({ title, subtitle, action }) => (
  <div className="mb-6 flex items-center justify-between">
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-slate-900">{title}</h2>
      {subtitle && <p className="text-slate-600 mt-1">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

// ═══════════════════════════════════════════════════════════════════
// STAT BOX
// ═══════════════════════════════════════════════════════════════════

export const StatBox = ({ icon: Icon, label, value, trend, color = "indigo" }) => (
  <Card className="p-6">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-slate-600 text-sm font-medium">{label}</p>
        <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
        {trend && <p className={`text-sm font-semibold mt-2 ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs semana anterior
        </p>}
      </div>
      {Icon && (
        <div className={`p-3 rounded-lg bg-${color}-100`}>
          <Icon className={`text-${color}-600`} size={24} />
        </div>
      )}
    </div>
  </Card>
);
