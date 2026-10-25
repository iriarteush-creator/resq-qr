// Diccionario Multilingüe Instantáneo (ES / EN / PT)
// Cero llamadas de red adicionales: embebido en el bundle para máxima velocidad en 3G/Edge

export type Lang = 'es' | 'en' | 'pt';

export const TRANSLATIONS: Record<Lang, {
  sosBanner: string;
  verifiedTag: string;
  bloodType: string;
  medicalAlert: string;
  noKnownConditions: string;
  allergies: string;
  conditions: string;
  medications: string;
  healthInsurance: string;
  organDonor: string;
  yes: string;
  no: string;
  sendGpsTitle: string;
  sendGpsSubtitle: string;
  btnGetGpsWhatsapp: string;
  btnGetGpsSms: string;
  locatingGps: string;
  gpsReady: string;
  gpsError: string;
  emergencyContacts: string;
  callNow: string;
  localEmergencyNumbers: string;
  medical107: string;
  police911: string;
  civilDefense103: string;
  vehicleData: string;
  plate: string;
  color: string;
  insurance: string;
  policyNumber: string;
  callTowService: string;
  privacyNotice: string;
  riderLoginBtn: string;
  whatsappSosTemplate: (riderName: string, code: string, mapsUrl: string, coords: string) => string;
  unclaimedTitle: string;
  unclaimedSubtitle: string;
  claimStepAccount: string;
  claimStepMedical: string;
  claimStepVehicle: string;
  activateQrBtn: string;
}> = {
  es: {
    sosBanner: 'FICHA DE EMERGENCIA PARA SOCORRISTAS',
    verifiedTag: 'QR ACTIVO',
    bloodType: 'GRUPO SANGUÍNEO',
    medicalAlert: 'ALERTA MÉDICA / CONDICIONES',
    noKnownConditions: 'Sin condiciones médicas ni alergias declaradas.',
    allergies: 'Alergias críticas',
    conditions: 'Condiciones / Patologías',
    medications: 'Medicación habitual',
    healthInsurance: 'Obra Social / Seguro Médico',
    organDonor: 'Donante de órganos',
    yes: 'Sí',
    no: 'No',
    sendGpsTitle: 'ENVIAR UBICACIÓN DE EMERGENCIA',
    sendGpsSubtitle: 'Toca para capturar tu GPS actual y avisar al contacto de emergencia del piloto.',
    btnGetGpsWhatsapp: 'Enviar Ubicación GPS por WhatsApp',
    btnGetGpsSms: 'Respaldo Baja Señal: Enviar GPS por SMS',
    locatingGps: 'Obteniendo coordenadas satelitales GPS...',
    gpsReady: 'Coordenadas listas para enviar',
    gpsError: 'No se pudo obtener el GPS automático. Se enviará mensaje de alerta directo.',
    emergencyContacts: 'CONTACTOS DE EMERGENCIA DEL PILOTO',
    callNow: 'LLAMAR AHORA',
    localEmergencyNumbers: 'EMERGENCIAS LOCALES (ARGENTINA / USHUAIA)',
    medical107: '107 Ambulancia',
    police911: '911 Policía',
    civilDefense103: '103 Def. Civil',
    vehicleData: 'DATOS DEL VEHÍCULO Y SEGURO',
    plate: 'Patente / Dominio',
    color: 'Color',
    insurance: 'Compañía de Seguro',
    policyNumber: 'Póliza Nº',
    callTowService: 'Llamar Asistencia / Grúa del Seguro',
    privacyNotice: 'Protección Antirrobo Activa: Esta ficha oculta domicilio particular y documento completo del titular.',
    riderLoginBtn: 'Soy el piloto · Editar mis datos',
    whatsappSosTemplate: (riderName, code, mapsUrl, coords) =>
      `🚨 *ALERTA SOS MOTO (${code})* 🚨\nHola, escaneé el llavero QR de emergencia de *${riderName}*.\n\n📍 *Ubicación GPS actual:* ${mapsUrl}\n🧭 *Coordenadas:* ${coords}\n\nPor favor comunícate urgente a este número.`,
    unclaimedTitle: '¡Bienvenido! Este Llavero QR es Nuevo',
    unclaimedSubtitle: 'Escaneaste un código virgen recién salido del blíster. Completa tus datos para activarlo y vincularlo a tu cuenta.',
    claimStepAccount: '1. Tu Cuenta de Acceso (Para editar en el futuro)',
    claimStepMedical: '2. Datos del Piloto y Condición Médica',
    claimStepVehicle: '3. Contacto de Emergencia y Datos de la Moto',
    activateQrBtn: 'Activar Llavero QR y Guardar Ficha',
  },
  en: {
    sosBanner: 'FIRST RESPONDER EMERGENCY PROFILE',
    verifiedTag: 'ACTIVE QR',
    bloodType: 'BLOOD TYPE',
    medicalAlert: 'MEDICAL ALERT / CONDITIONS',
    noKnownConditions: 'No known medical conditions or allergies reported.',
    allergies: 'Critical Allergies',
    conditions: 'Medical Conditions',
    medications: 'Current Medications',
    healthInsurance: 'Medical / Travel Insurance',
    organDonor: 'Organ Donor',
    yes: 'Yes',
    no: 'No',
    sendGpsTitle: 'SEND EMERGENCY GPS LOCATION',
    sendGpsSubtitle: 'Tap to capture your current GPS coordinates and alert the rider’s emergency contact.',
    btnGetGpsWhatsapp: 'Send GPS Location via WhatsApp',
    btnGetGpsSms: 'Low Signal Backup: Send GPS via SMS',
    locatingGps: 'Acquiring satellite GPS coordinates...',
    gpsReady: 'GPS coordinates ready to send',
    gpsError: 'Could not read automatic GPS. Direct alert message will be sent.',
    emergencyContacts: 'RIDER EMERGENCY CONTACTS',
    callNow: 'CALL NOW',
    localEmergencyNumbers: 'LOCAL EMERGENCY SERVICES (ARGENTINA / USHUAIA)',
    medical107: '107 Ambulance',
    police911: '911 Police',
    civilDefense103: '103 Rescue',
    vehicleData: 'MOTORCYCLE & INSURANCE INFO',
    plate: 'License Plate',
    color: 'Color',
    insurance: 'Insurance Company',
    policyNumber: 'Policy #',
    callTowService: 'Call Insurance Roadside / Tow',
    privacyNotice: 'Anti-Theft Privacy Active: Home address and full ID number are never stored or displayed.',
    riderLoginBtn: 'I am the rider · Edit profile',
    whatsappSosTemplate: (riderName, code, mapsUrl, coords) =>
      `🚨 *MOTO SOS ALERT (${code})* 🚨\nHello, I just scanned the emergency QR keychain of *${riderName}*.\n\n📍 *Current GPS Location:* ${mapsUrl}\n🧭 *Coordinates:* ${coords}\n\nPlease contact this number immediately.`,
    unclaimedTitle: 'Welcome! This QR Keychain is New',
    unclaimedSubtitle: 'You scanned an unactivated tag from the blister pack. Fill in your details below to lock and activate it.',
    claimStepAccount: '1. Your Account (To update your profile anytime)',
    claimStepMedical: '2. Rider Details & Medical Conditions',
    claimStepVehicle: '3. Emergency Contact & Motorcycle Info',
    activateQrBtn: 'Activate QR Keychain & Save Profile',
  },
  pt: {
    sosBanner: 'FICHA DE EMERGÊNCIA PARA SOCORRISTAS',
    verifiedTag: 'QR ATIVO',
    bloodType: 'TIPO SANGUÍNEO',
    medicalAlert: 'ALERTA MÉDICO / CONDIÇÕES',
    noKnownConditions: 'Sem condições médicas ou alergias declaradas.',
    allergies: 'Alergias críticas',
    conditions: 'Condições / Patologias',
    medications: 'Medicação contínua',
    healthInsurance: 'Plano de Saúde / Seguro Viagem',
    organDonor: 'Doador de órgãos',
    yes: 'Sim',
    no: 'Não',
    sendGpsTitle: 'ENVIAR LOCALIZAÇÃO DE EMERGÊNCIA',
    sendGpsSubtitle: 'Toque para capturar seu GPS atual e avisar o contato de emergência do motociclista.',
    btnGetGpsWhatsapp: 'Enviar Localização GPS por WhatsApp',
    btnGetGpsSms: 'Sinal Fraco (2G): Enviar GPS por SMS',
    locatingGps: 'Obtendo coordenadas de satélite GPS...',
    gpsReady: 'Coordenadas prontas para envio',
    gpsError: 'Não foi possível obter o GPS automático. O alerta será enviado diretamente.',
    emergencyContacts: 'CONTATOS DE EMERGÊNCIA DO PILOTO',
    callNow: 'LIGAR AGORA',
    localEmergencyNumbers: 'EMERGÊNCIAS LOCAIS (ARGENTINA / USHUAIA)',
    medical107: '107 Ambulância',
    police911: '911 Polícia',
    civilDefense103: '103 Def. Civil',
    vehicleData: 'DADOS DA MOTO E SEGURO',
    plate: 'Placa / Patente',
    color: 'Cor',
    insurance: 'Seguradora',
    policyNumber: 'Apólice Nº',
    callTowService: 'Ligar Assistência / Guincho do Seguro',
    privacyNotice: 'Proteção Antifurto Ativa: Endereço residencial e documento completo nunca são exibidos.',
    riderLoginBtn: 'Sou o piloto · Editar meus dados',
    whatsappSosTemplate: (riderName, code, mapsUrl, coords) =>
      `🚨 *ALERTA SOS MOTO (${code})* 🚨\nOlá, escaneei o chaveiro QR de emergência de *${riderName}*.\n\n📍 *Localização GPS atual:* ${mapsUrl}\n🧭 *Coordenadas:* ${coords}\n\nPor favor, entre em contato urgente com este número.`,
    unclaimedTitle: 'Bem-vindo! Este Chaveiro QR é Novo',
    unclaimedSubtitle: 'Você escaneou um código virgem recém-saído da embalagem. Preencha seus dados para ativá-lo.',
    claimStepAccount: '1. Sua Conta de Acesso (Para editar no futuro)',
    claimStepMedical: '2. Dados do Piloto e Condição Médica',
    claimStepVehicle: '3. Contato de Emergência e Dados da Moto',
    activateQrBtn: 'Ativar Chaveiro QR e Salvar Ficha',
  },
};
