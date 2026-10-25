export type BloodType = 'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'Desconocido';

export interface RiderProfile {
  qr_code: string;
  status: 'unclaimed' | 'active' | 'paused';
  owner_email?: string;
  full_name: string;
  nickname?: string;
  nationality: string;
  doc_last_digits?: string; // Solo últimos 3 dígitos (privacidad antirrobo)
  rider_photo_url?: string; // Foto del piloto arriba visible en la ficha

  // Condición médica
  blood_type: BloodType;
  has_medical_condition: boolean;
  allergies?: string;
  medical_conditions?: string;
  medications?: string;
  health_insurance?: string;
  health_insurance_number?: string; // Número de Obra Social / Afiliado
  observations?: string; // Campo Observaciones
  organ_donor?: boolean;

  // Contactos de emergencia (Principal + 2 adicionales)
  emergency_contact_1_name: string;
  emergency_contact_1_relation: string;
  emergency_contact_1_phone: string;
  emergency_contact_2_name?: string;
  emergency_contact_2_relation?: string;
  emergency_contact_2_phone?: string;
  emergency_contact_3_name?: string;
  emergency_contact_3_relation?: string;
  emergency_contact_3_phone?: string;

  // Datos del vehículo
  bike_brand_model: string;
  bike_year?: number;
  bike_color?: string;
  bike_plate: string;
  bike_photo_url?: string;
  bike_insurance_company?: string;
  bike_insurance_policy?: string;
  bike_insurance_phone?: string;
  hide_plate_publicly?: boolean;
}

export const DEMO_PROFILES: Record<string, RiderProfile> = {
  'DEMO-0001': {
    qr_code: 'DEMO-0001',
    status: 'active',
    full_name: 'Martín Alejandro Gómez',
    nickname: 'Tincho',
    nationality: 'AR',
    doc_last_digits: '842',
    rider_photo_url:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    blood_type: 'O-',
    has_medical_condition: true,
    allergies: 'ALERGIA SEVERA A PENICILINA Y DERIVADOS BETA-LACTÁMICOS',
    medical_conditions: 'Hipertensión arterial controlada. Tornillo de titanio en clavícula derecha.',
    medications: 'Losartán 50mg (1 comp. por la mañana)',
    health_insurance: 'OSDE 310 / Assist Card',
    health_insurance_number: '61-0492817-01',
    observations: 'Casco rebatible modular. Botiquín personal en maleta lateral izquierda.',
    organ_donor: true,
    emergency_contact_1_name: 'Laura Fernández',
    emergency_contact_1_relation: 'Esposa',
    emergency_contact_1_phone: '+5492901654321',
    emergency_contact_2_name: 'Jorge Gómez',
    emergency_contact_2_relation: 'Hermano',
    emergency_contact_2_phone: '+5491155443322',
    emergency_contact_3_name: 'Lucas Pereyra',
    emergency_contact_3_relation: 'Compañero de Ruta',
    emergency_contact_3_phone: '+5492901445566',
    bike_brand_model: 'Honda CRF1100L Africa Twin Adventure Sports',
    bike_year: 2024,
    bike_color: 'Tricolor (Blanco / Azul / Rojo)',
    bike_plate: 'A219KLP',
    bike_photo_url:
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=80',
    bike_insurance_company: 'Federación Patronal Seguros',
    bike_insurance_policy: 'FP-9948120-MOTO',
    bike_insurance_phone: '08002220022',
    hide_plate_publicly: false,
  },
};
