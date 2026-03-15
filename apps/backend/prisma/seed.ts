import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import crypto from 'crypto';

const prisma = new PrismaClient();

/**
 * Seed the database with realistic test listings.
 * These are based on REAL WhatsApp rental posts from the Oaxacan coast.
 * Run: npm run db:seed
 */

// Simple phone hashing for seed (deterministic)
async function seedHashPhone(phone: string): Promise<string> {
  const salt = crypto.createHash('sha256').update(phone).digest().slice(0, 16);
  return argon2.hash(phone, { salt, type: argon2.argon2id, memoryCost: 2 ** 16, timeCost: 3, parallelism: 1 });
}

// Simple encryption for seed
function seedEncryptPhone(phone: string): string {
  const key = Buffer.from('change-this-to-exactly-32-chars!', 'utf-8');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(phone, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

const LISTINGS = [
  {
    rawText: `Se renta amplio departamento en Mazunte disponible a partir del 25 de marzo
Cuenta con:
Recamara con cama king size
Sala con sofá cama
2 baños completos uno en la recamara y otro en la sala
Cocina privada y equipada
2 ventiladores potentes
Una pequeña terraza
Internet
Su precio por mes es de 12mil y si es por larga estancia se mejora el precio todas las ventanas están protegidas con mosquitero
Si te interesa mándame msj al WhatsApp 9581161795`,
    phone: '+529581161795',
    parsed: {
      is_rental: true, confidence_score: 0.98,
      price: 12000, currency: 'MXN', price_period: 'monthly', long_stay_discount: true,
      location: 'Mazunte, Oaxaca', neighborhood: null, property_type: 'departamento',
      bedrooms: 1, beds: [{ type: 'king_size', room: 'recámara' }, { type: 'sofa_cama', room: 'sala' }],
      bathrooms: 2, capacity: 3,
      dates_available: { from: '2026-03-25', to: null },
      amenities: ['cocina_equipada', 'internet_wifi', 'terraza', 'ventilador', 'mosquiteros'],
      missing_amenities_common: ['aire_acondicionado', 'estacionamiento', 'lavadora', 'agua_caliente'],
      summary_es: 'Amplio departamento en Mazunte. 1 recámara con cama king + sofá cama en sala. 2 baños completos, cocina equipada, terraza, WiFi. Mosquiteros en todas las ventanas. Descuento por larga estancia.',
      summary_en: 'Spacious apartment in Mazunte. 1 bedroom with king bed + sofa bed in living room. 2 full bathrooms, equipped kitchen, terrace, WiFi. Mosquito screens on all windows. Long-stay discount available.',
      quality_notes: ['No A/C mentioned (fans only)', 'No parking mentioned', 'Long-stay discount available but amount not specified'],
    },
  },
  {
    rawText: `Rento casa amueblada en San Agustinillo 🏠
3 recámaras, 2 baños
Cocina equipada, lavadora, internet
Terraza con vista al mar 🌊
Estacionamiento para 1 auto
Disponible mayo a noviembre
$18,000 MXN/mes
Info: 9581234567`,
    phone: '+529581234567',
    parsed: {
      is_rental: true, confidence_score: 0.96,
      price: 18000, currency: 'MXN', price_period: 'monthly', long_stay_discount: false,
      location: 'San Agustinillo, Oaxaca', neighborhood: null, property_type: 'casa',
      bedrooms: 3, beds: [], bathrooms: 2, capacity: 6,
      dates_available: { from: '2026-05-01', to: '2026-11-30' },
      amenities: ['amueblado', 'cocina_equipada', 'lavadora', 'internet_wifi', 'terraza', 'vista_al_mar', 'estacionamiento'],
      missing_amenities_common: ['aire_acondicionado', 'alberca'],
      summary_es: 'Casa amueblada en San Agustinillo con 3 recámaras, 2 baños, cocina equipada, lavadora, WiFi. Terraza con vista al mar y estacionamiento.',
      summary_en: 'Furnished house in San Agustinillo with 3 bedrooms, 2 bathrooms, equipped kitchen, washing machine, WiFi. Terrace with ocean view and parking.',
      quality_notes: ['Great ocean view terrace', 'Washing machine included - uncommon in the area', 'Parking included'],
    },
  },
  {
    rawText: `Cuarto disponible en Zipolite, zona Rincón del Sol
Baño compartido, cocina compartida
Ventilador de techo
Internet incluido
$4,500/mes - mínimo 2 meses
Contacto 9587654321`,
    phone: '+529587654321',
    parsed: {
      is_rental: true, confidence_score: 0.92,
      price: 4500, currency: 'MXN', price_period: 'monthly', long_stay_discount: false,
      location: 'Rincón del Sol, Zipolite', neighborhood: 'Rincón del Sol', property_type: 'cuarto',
      bedrooms: 1, beds: [], bathrooms: 1, capacity: 1,
      dates_available: { from: null, to: null },
      amenities: ['internet_wifi', 'ventilador'],
      missing_amenities_common: ['cocina_equipada', 'baño_privado', 'aire_acondicionado', 'lavadora'],
      summary_es: 'Cuarto en Zipolite, zona Rincón del Sol. Baño y cocina compartidos, ventilador, WiFi. Mínimo 2 meses.',
      summary_en: 'Room in Zipolite, Rincón del Sol area. Shared bathroom and kitchen, ceiling fan, WiFi. Minimum 2 months stay.',
      quality_notes: ['Shared bathroom and kitchen', 'Minimum 2 month stay required', 'Very affordable for the area', 'Budget option'],
    },
  },
  {
    rawText: `Beautiful loft in Puerto Angel!
Fully furnished, 1 bedroom, 1 bathroom
Private kitchen, A/C, high speed internet
Small garden with hammock
Available from April
$10,000 MXN or $600 USD per month
Long term discount available
WhatsApp: +52 958 111 2233`,
    phone: '+529581112233',
    parsed: {
      is_rental: true, confidence_score: 0.95,
      price: 10000, currency: 'MXN', price_period: 'monthly', long_stay_discount: true,
      location: 'Puerto Angel, Oaxaca', neighborhood: null, property_type: 'loft',
      bedrooms: 1, beds: [], bathrooms: 1, capacity: 2,
      dates_available: { from: '2026-04-01', to: null },
      amenities: ['amueblado', 'cocina_equipada', 'aire_acondicionado', 'internet_wifi', 'jardin'],
      missing_amenities_common: ['estacionamiento', 'lavadora', 'vista_al_mar'],
      summary_es: 'Loft amueblado en Puerto Angel con 1 recámara, 1 baño, cocina privada, A/C, internet de alta velocidad. Jardín con hamaca. Descuento por larga estancia.',
      summary_en: 'Fully furnished loft in Puerto Angel. 1 bedroom, 1 bathroom, private kitchen, A/C, high speed internet. Small garden with hammock. Long-term discount available.',
      quality_notes: ['Has A/C - important for hot season', 'Available in both MXN and USD', 'Garden with hammock is a nice touch'],
    },
  },
  {
    rawText: `SE RENTA ESTUDIO en la punta Mazunte
Disponible desde ya
Cama matrimonial, baño privado
Sin cocina pero hay cocina compartida afuera
Ventilador
$6,000 al mes
Solo larga estancia (mínimo 3 meses)
Tel 9589876543`,
    phone: '+529589876543',
    parsed: {
      is_rental: true, confidence_score: 0.90,
      price: 6000, currency: 'MXN', price_period: 'monthly', long_stay_discount: false,
      location: 'La Punta, Mazunte', neighborhood: 'La Punta', property_type: 'estudio',
      bedrooms: 1, beds: [{ type: 'matrimonial', room: 'estudio' }], bathrooms: 1, capacity: 2,
      dates_available: { from: '2026-03-14', to: null },
      amenities: ['ventilador'],
      missing_amenities_common: ['cocina_equipada', 'internet_wifi', 'aire_acondicionado', 'lavadora'],
      summary_es: 'Estudio en La Punta, Mazunte. Cama matrimonial, baño privado. Sin cocina privada (cocina compartida afuera). Solo larga estancia, mínimo 3 meses.',
      summary_en: 'Studio in La Punta, Mazunte. Double bed, private bathroom. No private kitchen (shared kitchen outside). Long-term only, minimum 3 months.',
      quality_notes: ['No private kitchen - shared kitchen outside', 'No WiFi mentioned', 'Minimum 3 month stay', 'Available immediately', 'Budget-friendly location'],
    },
  },
  {
    rawText: `🌴 Cabaña rústica en la selva de Mazunte 🌴
Disponible abril-diciembre
2 recámaras (1 king, 1 individual)
1 baño con agua caliente solar
Cocina equipada con estufa de gas
Terraza grande con hamacas
WiFi satelital
Rodeada de naturaleza, 10 min caminando a la playa
$15,000/mes negociable
Mascotas bienvenidas 🐕
9581119999`,
    phone: '+529581119999',
    parsed: {
      is_rental: true, confidence_score: 0.97,
      price: 15000, currency: 'MXN', price_period: 'monthly', long_stay_discount: false,
      location: 'Selva, Mazunte', neighborhood: 'Selva', property_type: 'cabana',
      bedrooms: 2, beds: [{ type: 'king_size', room: 'recámara 1' }, { type: 'individual', room: 'recámara 2' }],
      bathrooms: 1, capacity: 3,
      dates_available: { from: '2026-04-01', to: '2026-12-31' },
      amenities: ['cocina_equipada', 'gas', 'internet_wifi', 'terraza', 'agua_caliente', 'mascotas_permitidas'],
      missing_amenities_common: ['aire_acondicionado', 'estacionamiento', 'lavadora'],
      summary_es: 'Cabaña rústica en la selva de Mazunte. 2 recámaras, 1 baño con agua caliente solar, cocina con gas, terraza con hamacas, WiFi satelital. 10 min a la playa. Mascotas bienvenidas. Precio negociable.',
      summary_en: 'Rustic cabin in Mazunte jungle. 2 bedrooms, 1 bathroom with solar hot water, kitchen with gas stove, terrace with hammocks, satellite WiFi. 10 min walk to beach. Pets welcome. Price negotiable.',
      quality_notes: ['Pets allowed - rare in the area', 'Solar hot water', '10 min walk to beach', 'Price is negotiable', 'Satellite WiFi may be slow'],
    },
  },
  {
    rawText: `Departamento 2 recámaras en centro de Mazunte
Arriba de la tienda La Cosecha
Completamente amueblado
2 baños, cocina, sala, balcón
A/C en recámara principal
Agua caliente
Estacionamiento
$14,000/mes
Disponible 1 de mayo
9582223344`,
    phone: '+529582223344',
    parsed: {
      is_rental: true, confidence_score: 0.95,
      price: 14000, currency: 'MXN', price_period: 'monthly', long_stay_discount: false,
      location: 'Centro, Mazunte', neighborhood: 'Centro', property_type: 'departamento',
      bedrooms: 2, beds: [], bathrooms: 2, capacity: 4,
      dates_available: { from: '2026-05-01', to: null },
      amenities: ['amueblado', 'cocina_equipada', 'balcon', 'aire_acondicionado', 'agua_caliente', 'estacionamiento'],
      missing_amenities_common: ['internet_wifi', 'lavadora', 'mascotas_permitidas'],
      summary_es: 'Departamento amueblado en centro de Mazunte. 2 recámaras, 2 baños, cocina, sala, balcón. A/C en recámara principal, agua caliente, estacionamiento.',
      summary_en: 'Furnished apartment in central Mazunte. 2 bedrooms, 2 bathrooms, kitchen, living room, balcony. A/C in master bedroom, hot water, parking.',
      quality_notes: ['Central location above La Cosecha store', 'A/C only in master bedroom', 'No WiFi mentioned - ask landlord', 'Parking included - valuable in Centro'],
    },
  },
  {
    rawText: `Rento cuartito económico en Puerto Escondido, Rinconada
Baño privado, sin cocina
Ventilador
Cerca de Zicatela
$3,500 al mes
Minimo 1 mes
9541234567`,
    phone: '+529541234567',
    parsed: {
      is_rental: true, confidence_score: 0.88,
      price: 3500, currency: 'MXN', price_period: 'monthly', long_stay_discount: false,
      location: 'Rinconada, Puerto Escondido', neighborhood: 'Rinconada', property_type: 'cuarto',
      bedrooms: 1, beds: [], bathrooms: 1, capacity: 1,
      dates_available: { from: null, to: null },
      amenities: ['ventilador'],
      missing_amenities_common: ['cocina_equipada', 'internet_wifi', 'aire_acondicionado', 'agua_caliente', 'lavadora'],
      summary_es: 'Cuarto económico en Rinconada, Puerto Escondido. Baño privado, sin cocina. Ventilador. Cerca de Zicatela. Mínimo 1 mes.',
      summary_en: 'Budget room in Rinconada, Puerto Escondido. Private bathroom, no kitchen. Fan. Close to Zicatela. Minimum 1 month.',
      quality_notes: ['Very budget option', 'No kitchen', 'No WiFi mentioned', 'Close to Zicatela beach', 'Minimum 1 month stay'],
    },
  },
];

async function main() {
  console.log('🌱 Seeding database...\n');

  // Create admin user
  const adminPasswordHash = await argon2.hash('admin123456!', {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });

  const admin = await prisma.admin.upsert({
    where: { email: 'admin@casamazunte.com' },
    update: {},
    create: {
      email: 'admin@casamazunte.com',
      passwordHash: adminPasswordHash,
      name: 'Admin',
    },
  });
  console.log(`✓ Admin created: ${admin.email} (password: admin123456!)\n`);

  // Create listings
  for (let i = 0; i < LISTINGS.length; i++) {
    const item = LISTINGS[i];
    const phoneHash = await seedHashPhone(item.phone);
    const phoneEnc = seedEncryptPhone(item.phone);

    // Alternate statuses: some ACTIVE, some PENDING_REVIEW
    const status = i < 6 ? 'ACTIVE' : 'PENDING_REVIEW';

    const listing = await prisma.listing.create({
      data: {
        source: i < 5 ? 'WHATSAPP_CAPTURE' : 'ULTRAMSG_INBOUND',
        status,
        senderPhoneHash: phoneHash,
        senderPhoneEnc: phoneEnc,
        rawText: item.rawText,
        parsedData: JSON.stringify(item.parsed),
        groupName: i % 2 === 0 ? 'Rentas Mazunte' : 'Casas Costa Oaxaqueña',
      },
    });

    console.log(
      `✓ Listing ${i + 1}/${LISTINGS.length}: ${item.parsed.property_type} in ${item.parsed.location} - $${item.parsed.price} ${item.parsed.currency} [${status}]`
    );

    // Add a promotion to one listing (the nice San Agustinillo house)
    if (i === 1) {
      const now = new Date();
      await prisma.promotion.create({
        data: {
          listingId: listing.id,
          isPromoted: true,
          promotedAt: now,
          expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          donationReceiptUrl: '/uploads/receipts/sample-receipt.jpg',
          approvedBy: admin.id,
        },
      });
      console.log(`  ⭐ Promoted listing (Community Supporter badge)`);
    }
  }

  console.log('\n🎉 Seed completed! Database populated with test data.');
  console.log(`   - ${LISTINGS.length} listings created`);
  console.log(`   - 1 promoted listing with badge`);
  console.log(`   - Admin login: admin@casamazunte.com / admin123456!`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
