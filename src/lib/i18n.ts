export type Lang = 'es' | 'en' | 'pt';

export interface SosMessagePayload {
  riderName: string;
  contactName: string;
  contactRelation: string;
  code: string;
  bikeModel: string;
  bikePlate: string;
  bloodType: string;
  mapsUrl: string | null;
  coords: string | null;
  profileUrl: string;
}

export const TRANSLATIONS: Record<
  Lang,
  {
    sosBanner: string;
    verifiedTag: string;
    bloodType: string;
    medicalAlert: string;
    noKnownConditions: string;
    allergies: string;
    conditions: string;
    medications: string;
    healthInsurance: string;
    healthInsuranceNumber: string;
    observations: string;
    organDonor: string;
    yes: string;
    no: string;
    sendGpsTitle: string;
    sendGpsSubtitle: string;
    recipientLabel: string;
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
    whatsappSosTemplate: (p: SosMessagePayload) => string;
    unclaimedTitle: string;
    unclaimedSubtitle: string;
    claimStepAccount: string;
    claimStepMedical: string;
    claimStepVehicle: string;
    activateQrBtn: string;
  }
> = {
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
    healthInsuranceNumber: 'Nº de Afiliado / Credencial',
    observations: 'Observaciones / Indicaciones Especiales',
    organDonor: 'Donante de órganos',
    yes: 'Sí',
    no: 'No',
    sendGpsTitle: 'ENVIAR UBICACIÓN DE EMERGENCIA',
    sendGpsSubtitle:
      'Envía una alerta inmediata por WhatsApp o SMS con tu ubicación GPS al contacto de emergencia del piloto.',
    recipientLabel: 'Enviar alerta a:',
    btnGetGpsWhatsapp: 'Enviar Alerta y GPS por WhatsApp a',
    btnGetGpsSms: 'Respaldo Baja Señal: Enviar SMS a',
    locatingGps: 'Obteniendo coordenadas satelitales GPS...',
    gpsReady: 'Coordenadas GPS listas para enviar',
    gpsError:
      'Tu navegador no permitió leer el GPS (verifica permisos de Ubicación en tu celular). Se enviará la alerta con los datos del piloto.',
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
    privacyNotice:
      'Protección Antirrobo Activa: Esta ficha oculta domicilio particular y documento completo del titular.',
    riderLoginBtn: 'Soy el piloto · Ingresar o Recuperar Clave',
    whatsappSosTemplate: (p) => {
      const rName = p.riderName.trim() || 'Piloto';
      const cName = p.contactName.trim() || 'Contacto de Emergencia';
      const cRel = p.contactRelation.trim() ? ` (${p.contactRelation.trim()})` : '';
      const bike = p.bikeModel.trim() || 'Moto';
      const plate = p.bikePlate.trim() || 'S/D';
      const blood = p.bloodType.trim() || 'S/D';

      const gpsSection = p.mapsUrl
        ? `*UBICACION GPS DEL INCIDENTE:*\n${p.mapsUrl}\nCoordenadas: ${p.coords}`
        : `*UBICACION:* (El celular desde el que se escaneo el QR no tiene permisos de GPS activados; comunicate a este numero para confirmar el lugar exacto).`;

      return [
        `*ALERTA DE EMERGENCIA - ResQ (${p.code})*`,
        ``,
        `Hola *${cName}*${cRel}, te escribo porque acabo de escanear el llavero QR de emergencia de:`,
        `- *Piloto:* ${rName}`,
        `- *Moto:* ${bike} (Patente: *${plate}*)`,
        `- *Grupo Sanguineo:* ${blood}`,
        ``,
        gpsSection,
        ``,
        `*Ficha medica completa del piloto:*`,
        `${p.profileUrl}`,
        ``,
        `Por favor comunicate urgente conmigo a este numero desde el que te estoy escribiendo.`,
      ].join('\n');
    },
    unclaimedTitle: '¡Bienvenido! Este Llavero QR es Nuevo',
    unclaimedSubtitle:
      'Escaneaste un código virgen recién salido del blíster. Completa tus datos para activarlo y vincularlo a tu cuenta.',
    claimStepAccount: '1. Tu Cuenta de Acceso (Para editar en el futuro)',
    claimStepMedical: '2. Datos del Piloto, Foto y Condición Médica',
    claimStepVehicle: '3. Contactos de Emergencia y Datos de la Moto',
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
    healthInsuranceNumber: 'Member / Policy ID',
    observations: 'Observations / Special Notes',
    organDonor: 'Organ Donor',
    yes: 'Yes',
    no: 'No',
    sendGpsTitle: 'SEND EMERGENCY GPS LOCATION',
    sendGpsSubtitle:
      'Send an immediate WhatsApp or SMS alert with your GPS coordinates to the rider’s emergency contact.',
    recipientLabel: 'Send alert to:',
    btnGetGpsWhatsapp: 'Send WhatsApp Alert & GPS to',
    btnGetGpsSms: 'Low Signal Backup: Send SMS to',
    locatingGps: 'Acquiring satellite GPS coordinates...',
    gpsReady: 'GPS coordinates ready to send',
    gpsError:
      'Browser location permission is disabled. Sending emergency alert with rider details.',
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
    privacyNotice:
      'Anti-Theft Privacy Active: Home address and full ID number are never stored or displayed.',
    riderLoginBtn: 'I am the rider · Login or Reset Password',
    whatsappSosTemplate: (p) => {
      const rName = p.riderName.trim() || 'Rider';
      const cName = p.contactName.trim() || 'Emergency Contact';
      const cRel = p.contactRelation.trim() ? ` (${p.contactRelation.trim()})` : '';
      const bike = p.bikeModel.trim() || 'Motorcycle';
      const plate = p.bikePlate.trim() || 'N/A';
      const blood = p.bloodType.trim() || 'N/A';

      const gpsSection = p.mapsUrl
        ? `*INCIDENT GPS LOCATION:*\n${p.mapsUrl}\nCoordinates: ${p.coords}`
        : `*LOCATION:* (GPS permission was not enabled on the scanner phone; please reply or call this number to confirm location).`;

      return [
        `*EMERGENCY SOS ALERT - ResQ (${p.code})*`,
        ``,
        `Hello *${cName}*${cRel}, I just scanned the emergency QR keychain of:`,
        `- *Rider:* ${rName}`,
        `- *Motorcycle:* ${bike} (Plate: *${plate}*)`,
        `- *Blood Type:* ${blood}`,
        ``,
        gpsSection,
        ``,
        `*Full Medical & SOS Profile:*`,
        `${p.profileUrl}`,
        ``,
        `Please contact me urgently at this phone number.`,
      ].join('\n');
    },
    unclaimedTitle: 'Welcome! This QR Keychain is New',
    unclaimedSubtitle:
      'You scanned an unactivated tag from the blister pack. Fill in your details below to lock and activate it.',
    claimStepAccount: '1. Your Account (To update your profile anytime)',
    claimStepMedical: '2. Rider Photo, Details & Medical Conditions',
    claimStepVehicle: '3. Emergency Contacts & Motorcycle Info',
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
    healthInsuranceNumber: 'Nº de Associado / Carteirinha',
    observations: 'Observações / Indicações Especiais',
    organDonor: 'Doador de órgãos',
    yes: 'Sim',
    no: 'Não',
    sendGpsTitle: 'ENVIAR LOCALIZAÇÃO DE EMERGÊNCIA',
    sendGpsSubtitle:
      'Envie um alerta imediato por WhatsApp ou SMS com sua localização GPS para o contato de emergência do piloto.',
    recipientLabel: 'Enviar alerta para:',
    btnGetGpsWhatsapp: 'Enviar Alerta e GPS por WhatsApp para',
    btnGetGpsSms: 'Sinal Fraco (2G): Enviar SMS para',
    locatingGps: 'Obtendo coordenadas de satélite GPS...',
    gpsReady: 'Coordenadas GPS prontas para envio',
    gpsError:
      'Permissão de GPS desativada no navegador. O alerta será enviado com os dados do piloto.',
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
    privacyNotice:
      'Proteção Antifurto Ativa: Endereço residencial e documento completo nunca são exibidos.',
    riderLoginBtn: 'Sou o piloto · Entrar ou Recuperar Senha',
    whatsappSosTemplate: (p) => {
      const rName = p.riderName.trim() || 'Piloto';
      const cName = p.contactName.trim() || 'Contato de Emergencia';
      const cRel = p.contactRelation.trim() ? ` (${p.contactRelation.trim()})` : '';
      const bike = p.bikeModel.trim() || 'Moto';
      const plate = p.bikePlate.trim() || 'S/D';
      const blood = p.bloodType.trim() || 'S/D';

      const gpsSection = p.mapsUrl
        ? `*LOCALIZACAO GPS DO INCIDENTE:*\n${p.mapsUrl}\nCoordenadas: ${p.coords}`
        : `*LOCALIZACAO:* (O celular que escaneou o QR nao estava com permissao de GPS ativa; ligue ou responda para este numero para confirmar o local).`;

      return [
        `*ALERTA DE EMERGENCIA - ResQ (${p.code})*`,
        ``,
        `Ola *${cName}*${cRel}, acabei de escanear o chaveiro QR de emergencia de:`,
        `- *Piloto:* ${rName}`,
        `- *Moto:* ${bike} (Placa: *${plate}*)`,
        `- *Tipo Sanguineo:* ${blood}`,
        ``,
        gpsSection,
        ``,
        `*Ficha medica completa do piloto:*`,
        `${p.profileUrl}`,
        ``,
        `Por favor, entre em contato urgente comigo por este numero.`,
      ].join('\n');
    },
    unclaimedTitle: 'Bem-vindo! Este Chaveiro QR é Novo',
    unclaimedSubtitle:
      'Você escaneou um código virgem recém-saído da embalagem. Preencha seus dados para ativá-lo.',
    claimStepAccount: '1. Sua Conta de Acesso (Para editar no futuro)',
    claimStepMedical: '2. Foto do Piloto, Dados e Condição Médica',
    claimStepVehicle: '3. Contatos de Emergência e Dados da Moto',
    activateQrBtn: 'Ativar Chaveiro QR e Salvar Ficha',
  },
};
