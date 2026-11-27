import { useEffect, useRef, useState, type ChangeEvent, type FocusEvent, type PointerEvent } from 'react';

type FormData = {
  documentType: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  phone: string;
  acceptsPolicy: boolean;
};

const initialForm: FormData = {
  documentType: '',
  documentNumber: '',
  firstName: '',
  lastName: '',
  email: '',
  countryCode: '+57',
  phone: '',
  acceptsPolicy: false,
};

const validatedFields: (keyof FormData)[] = [
  'documentType',
  'documentNumber',
  'firstName',
  'lastName',
  'email',
  'phone',
  'acceptsPolicy',
];

const countries = [
  { code: '+57', short: 'CO' },
  { code: '+1', short: 'US' },
  { code: '+52', short: 'MX' },
  { code: '+51', short: 'PE' },
  { code: '+593', short: 'EC' },
];

export default function App() {
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<FormData>(initialForm);
  const [touched, setTouched] = useState<Partial<Record<keyof FormData, boolean>>>({});
  const [focusedField, setFocusedField] = useState<keyof FormData | null>(null);
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [saved, setSaved] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  const requiredFieldsComplete =
    form.documentType !== '' &&
    form.documentNumber.trim() !== '' &&
    form.firstName.trim() !== '' &&
    form.lastName.trim() !== '' &&
    form.email.trim() !== '' &&
    form.phone.trim() !== '';
  const documentRequiresNumbers = form.documentType === 'cc' || form.documentType === 'ce';
  const documentIsValid = documentRequiresNumbers
    ? /^\d{3,20}$/.test(form.documentNumber.trim())
    : /^[a-zA-Z0-9]{3,20}$/.test(form.documentNumber.trim());
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const phoneIsValid = /^\d{6,15}$/.test(form.phone);
  const isValid = requiredFieldsComplete && documentIsValid && emailIsValid && phoneIsValid && form.acceptsPolicy;

  const fieldErrors: Partial<Record<keyof FormData, string>> = {
    documentType:
      touched.documentType && (showAllErrors || focusedField !== 'documentType') && !form.documentType
        ? 'Selecciona un tipo de documento.'
        : undefined,
    documentNumber:
      touched.documentNumber && (showAllErrors || focusedField !== 'documentNumber') && !documentIsValid
        ? !form.documentType
          ? 'Selecciona primero el tipo de documento.'
          : documentRequiresNumbers
            ? 'Ingresa entre 3 y 20 números, sin letras.'
            : 'Usa entre 3 y 20 letras o números.'
        : undefined,
    firstName:
      touched.firstName && (showAllErrors || focusedField !== 'firstName') && !form.firstName.trim()
        ? 'Ingresa tu nombre.'
        : undefined,
    lastName:
      touched.lastName && (showAllErrors || focusedField !== 'lastName') && !form.lastName.trim()
        ? 'Ingresa tu apellido.'
        : undefined,
    email:
      touched.email && (showAllErrors || focusedField !== 'email') && !emailIsValid
        ? 'Escribe un correo válido, por ejemplo nombre@correo.com.'
        : undefined,
    phone:
      touched.phone && (showAllErrors || focusedField !== 'phone') && !phoneIsValid
        ? 'El celular debe tener entre 6 y 15 números.'
        : undefined,
    acceptsPolicy:
      touched.acceptsPolicy && (showAllErrors || focusedField !== 'acceptsPolicy') && !form.acceptsPolicy
        ? 'Debes aceptar la política para continuar.'
        : undefined,
  };

  const updateField = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    const nextValue = event.target instanceof HTMLInputElement && event.target.type === 'checkbox' ? event.target.checked : value;
    setForm((current) => {
      if (name === 'documentType') {
        const numericType = value === 'cc' || value === 'ce';
        return {
          ...current,
          documentType: value,
          documentNumber: numericType ? current.documentNumber.replace(/\D/g, '') : current.documentNumber,
        };
      }

      return {
        ...current,
        [name]: name === 'acceptsPolicy'
          ? nextValue
          :
          name === 'documentNumber'
            ? documentRequiresNumbers
              ? value.replace(/\D/g, '')
              : value.replace(/[^a-zA-Z0-9]/g, '')
            : name === 'phone'
              ? value.replace(/\D/g, '')
              : value,
      };
    });
  };

  const submitPersonalData = () => {
    if (isValid) {
      setStep(2);
      return;
    }

    setShowAllErrors(true);
    setTouched(Object.fromEntries(validatedFields.map((field) => [field, true])));

    const firstInvalidField = [
      !form.documentType && 'documentType',
      !documentIsValid && 'documentNumber',
      !form.firstName.trim() && 'firstName',
      !form.lastName.trim() && 'lastName',
      !emailIsValid && 'email',
      !phoneIsValid && 'phone',
      !form.acceptsPolicy && 'acceptsPolicy',
    ].find(Boolean);

    if (firstInvalidField) {
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>(`[name="${firstInvalidField}"]`)?.focus();
      });
    }
  };

  const markAsTouched = (event: FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    setTouched((current) => ({ ...current, [event.target.name]: true }));
    setFocusedField(null);
  };

  const markAsFocused = (event: FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFocusedField(event.target.name as keyof FormData);
  };

  const feedbackFor = (field: keyof FormData) =>
    fieldErrors[field] ? (
      <span className="field-message" id={`${field}-message`} role="alert">
        {fieldErrors[field]}
      </span>
    ) : null;

  useEffect(() => {
    if (step !== 2) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const snapshot = canvas.toDataURL();
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.scale(ratio, ratio);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-ink').trim();
      context.lineWidth = 2.25;

      const image = new Image();
      image.onload = () => context.drawImage(image, 0, 0, rect.width, rect.height);
      image.src = snapshot;
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [step]);

  const getPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const startDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    const context = event.currentTarget.getContext('2d');
    if (!context) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getPoint(event);
    drawingRef.current = true;
    context.beginPath();
    context.moveTo(point.x, point.y);
  };

  const draw = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const context = event.currentTarget.getContext('2d');
    if (!context) return;
    const point = getPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
    setHasSignature(true);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setSaved(false);
  };

  return (
    <main className="page-shell min-h-[100dvh] px-4 pb-3 pt-6 sm:px-8 sm:py-6">
      <div className="mx-auto max-w-[880px] sm:flex sm:min-h-[calc(100dvh-3rem)] sm:flex-col sm:justify-center">
        <header className="mb-6 sm:mb-8">
          <img src="/assets/ruta-n-logo.png" alt="Ruta N" className="h-auto min-w-[100px] w-[100px] sm:w-[120px]" />
        </header>

        <section>
          <div>
            <div className="section-rule border-b pb-4 sm:pb-6">
              <div className="flex items-center gap-4">
                <p className="step-label">Paso {step} de 2</p>
                <div className="progress-track h-1.5 w-36 overflow-clip rounded-full sm:w-52">
                  <div
                    className="progress-value h-full w-full origin-left rounded-full transition-transform duration-500"
                    style={{ transform: step === 1 ? 'scaleX(0.5)' : 'scaleX(1)' }}
                  />
                </div>
              </div>
              <div className="mt-1.5 flex flex-col justify-between gap-2 sm:mt-2.5 sm:flex-row sm:items-end">
                <h1 className="display-head text-[24px] font-bold leading-tight tracking-[-0.025em] sm:text-[34px]">
                  {step === 1 ? 'Datos personales' : 'Tu firma'}
                </h1>
                <p className="support-copy hidden max-w-[330px] text-sm leading-5 sm:block sm:text-right">
                  {step === 1
                    ? 'Completa la información para continuar.'
                    : 'Firma con el mouse o directamente sobre la pantalla.'}
                </p>
              </div>
            </div>

            {step === 1 ? (
              <form
                className="pt-4 sm:pt-7"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  submitPersonalData();
                }}
              >
                <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-5">
                  <label className="field-label">
                    <span>Tipo de documento <b>*</b></span>
                    <select className="field-input" name="documentType" value={form.documentType} onChange={updateField} onFocus={markAsFocused} onBlur={markAsTouched} aria-invalid={Boolean(fieldErrors.documentType)} aria-describedby={fieldErrors.documentType ? 'documentType-message' : undefined} required>
                      <option value="" disabled>Selecciona una opción</option>
                      <option value="cc">Cédula de ciudadanía</option>
                      <option value="ce">Cédula de extranjería</option>
                      <option value="passport">Pasaporte</option>
                      <option value="pep">Permiso especial</option>
                    </select>
                    {feedbackFor('documentType')}
                  </label>

                  <label className="field-label">
                    <span>Número de documento <b>*</b></span>
                    <input className="field-input" name="documentNumber" value={form.documentNumber} onChange={updateField} onFocus={markAsFocused} onBlur={markAsTouched} inputMode={documentRequiresNumbers ? 'numeric' : 'text'} aria-invalid={Boolean(fieldErrors.documentNumber)} aria-describedby={fieldErrors.documentNumber ? 'documentNumber-message' : undefined} minLength={3} maxLength={20} required />
                    {feedbackFor('documentNumber')}
                  </label>

                  <label className="field-label">
                    <span>Nombre <b>*</b></span>
                    <input className="field-input" name="firstName" value={form.firstName} onChange={updateField} onFocus={markAsFocused} onBlur={markAsTouched} aria-invalid={Boolean(fieldErrors.firstName)} aria-describedby={fieldErrors.firstName ? 'firstName-message' : undefined} autoComplete="given-name" required />
                    {feedbackFor('firstName')}
                  </label>

                  <label className="field-label">
                    <span>Apellido <b>*</b></span>
                    <input className="field-input" name="lastName" value={form.lastName} onChange={updateField} onFocus={markAsFocused} onBlur={markAsTouched} aria-invalid={Boolean(fieldErrors.lastName)} aria-describedby={fieldErrors.lastName ? 'lastName-message' : undefined} autoComplete="family-name" required />
                    {feedbackFor('lastName')}
                  </label>

                  <label className="field-label sm:col-span-2">
                    <span>Correo electrónico <b>*</b></span>
                    <input className="field-input" type="email" name="email" value={form.email} onChange={updateField} onFocus={markAsFocused} onBlur={markAsTouched} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'email-message' : undefined} placeholder="nombre@correo.com" autoComplete="email" required />
                    {feedbackFor('email')}
                  </label>

                  <fieldset className="sm:col-span-2">
                    <legend className="field-legend mb-2 text-sm font-bold">Número de celular <b>*</b></legend>
                    <div className="grid grid-cols-[120px_1fr] gap-3">
                      <label className="sr-only" htmlFor="countryCode">Código de país</label>
                      <select id="countryCode" className="field-input" name="countryCode" value={form.countryCode} onChange={updateField}>
                        {countries.map((country) => (
                          <option key={country.code} value={country.code}>{country.short} {country.code}</option>
                        ))}
                      </select>
                      <label className="sr-only" htmlFor="phone">Celular</label>
                      <input id="phone" className="field-input" name="phone" inputMode="numeric" value={form.phone} onChange={updateField} onFocus={markAsFocused} onBlur={markAsTouched} aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? 'phone-message' : undefined} placeholder="300 000 0000" autoComplete="tel-national" minLength={6} maxLength={15} required />
                    </div>
                    {feedbackFor('phone')}
                  </fieldset>
                </div>

                <div className="policy-field">
                  <label className="policy-label">
                    <input
                      className="policy-checkbox"
                      type="checkbox"
                      name="acceptsPolicy"
                      checked={form.acceptsPolicy}
                      onChange={updateField}
                      onFocus={markAsFocused}
                      onBlur={markAsTouched}
                      aria-invalid={Boolean(fieldErrors.acceptsPolicy)}
                      aria-describedby={fieldErrors.acceptsPolicy ? 'acceptsPolicy-message' : undefined}
                      required
                    />
                    <span>
                      Autorizo a Ruta N a tratar mis datos personales según su{' '}
                      <a href="[PEGAR URL]" target="_blank" rel="noreferrer">
                        Política de tratamiento de datos
                      </a>
                      .
                    </span>
                  </label>
                  {feedbackFor('acceptsPolicy')}
                </div>

                <div className="form-actions">
                  <button type="submit" className="primary-button ml-auto w-full sm:w-auto">
                    Continuar
                  </button>
                </div>
              </form>
            ) : (
              <div className="pt-4 sm:pt-7">
                <div className="signature-field relative overflow-clip rounded-lg border border-dashed">
                  {!hasSignature && (
                    <div className="pointer-events-none absolute inset-0 grid place-items-center">
                      <div className="signature-placeholder text-center">
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="mx-auto mb-2 h-6 w-6">
                          <path d="m14.7 5.3 4 4M4 20l3.8-.8L19.4 7.6a1.8 1.8 0 0 0 0-2.5l-.5-.5a1.8 1.8 0 0 0-2.5 0L4.8 16.2 4 20Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-sm">Firma aquí</span>
                      </div>
                    </div>
                  )}
                  <canvas
                    ref={canvasRef}
                    aria-label="Área para dibujar la firma"
                    className="h-[300px] w-full cursor-crosshair touch-none sm:h-[270px]"
                    onPointerDown={startDrawing}
                    onPointerMove={draw}
                    onPointerUp={() => { drawingRef.current = false; }}
                    onPointerCancel={() => { drawingRef.current = false; }}
                    onPointerLeave={() => { drawingRef.current = false; }}
                  />
                  <div aria-hidden="true" className="signature-line pointer-events-none absolute bottom-12 left-[8%] h-px w-[84%]" />
                </div>

                <div className="mt-3 flex justify-end">
                  <button type="button" onClick={clearSignature} disabled={!hasSignature} className="clear-button">
                    Limpiar firma
                  </button>
                </div>

                {saved && (
                  <div role="status" className="success-message mt-5 rounded-lg border px-4 py-3 text-sm font-semibold">
                    Tu información y firma se guardaron correctamente.
                  </div>
                )}

                <div className="form-actions">
                  <button type="button" onClick={() => { setStep(1); setSaved(false); }} className="secondary-button">
                    Regresar
                  </button>
                  <button type="button" onClick={() => hasSignature && setSaved(true)} disabled={!hasSignature || saved} className="primary-button">
                    {saved ? 'Guardado' : 'Guardar'}
                  </button>
                </div>
                <p className="privacy-note mt-3 text-xs">Tratamos tus datos de forma segura y responsable.</p>
              </div>
            )}
          </div>
        </section>

      </div>
    </main>
  );
}
