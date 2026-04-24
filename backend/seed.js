require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function seed() {
  console.log('🌱 Seeding database...');

  // Drop and recreate tables
  await pool.query(`
    DROP TABLE IF EXISTS budgets CASCADE;
    DROP TABLE IF EXISTS tasks CASCADE;
    DROP TABLE IF EXISTS invitations CASCADE;
    DROP TABLE IF EXISTS seating CASCADE;
    DROP TABLE IF EXISTS guests CASCADE;
    DROP TABLE IF EXISTS entertainment CASCADE;
    DROP TABLE IF EXISTS catering_menus CASCADE;
    DROP TABLE IF EXISTS vendors CASCADE;
    DROP TABLE IF EXISTS venues CASCADE;
    DROP TABLE IF EXISTS events CASCADE;
    DROP TABLE IF EXISTS users CASCADE;

    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE events (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      event_type VARCHAR(100),
      date DATE,
      time VARCHAR(50),
      location VARCHAR(255),
      description TEXT,
      max_guests INTEGER,
      budget DECIMAL(12,2),
      status VARCHAR(50) DEFAULT 'Planning',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE venues (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      address VARCHAR(500),
      capacity INTEGER,
      venue_type VARCHAR(100),
      hourly_rate DECIMAL(10,2),
      amenities TEXT,
      contact_phone VARCHAR(50),
      contact_email VARCHAR(255),
      rating DECIMAL(3,1),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE guests (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
      rsvp_status VARCHAR(50) DEFAULT 'Pending',
      dietary_restrictions VARCHAR(255),
      plus_ones INTEGER DEFAULT 0,
      table_number INTEGER,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE catering_menus (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      cuisine_type VARCHAR(100),
      price_per_person DECIMAL(10,2),
      min_guests INTEGER,
      max_guests INTEGER,
      menu_items TEXT,
      dietary_options VARCHAR(255),
      vendor_name VARCHAR(255),
      rating DECIMAL(3,1),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE vendors (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      service_type VARCHAR(100),
      contact_email VARCHAR(255),
      contact_phone VARCHAR(50),
      hourly_rate DECIMAL(10,2),
      rating DECIMAL(3,1),
      description TEXT,
      availability VARCHAR(50) DEFAULT 'Available',
      portfolio_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE budgets (
      id SERIAL PRIMARY KEY,
      event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
      category VARCHAR(100),
      estimated_cost DECIMAL(12,2),
      actual_cost DECIMAL(12,2) DEFAULT 0,
      vendor_name VARCHAR(255),
      notes TEXT,
      status VARCHAR(50) DEFAULT 'Pending',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE tasks (
      id SERIAL PRIMARY KEY,
      event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      assigned_to VARCHAR(255),
      due_date DATE,
      priority VARCHAR(50) DEFAULT 'Medium',
      status VARCHAR(50) DEFAULT 'Pending',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE invitations (
      id SERIAL PRIMARY KEY,
      event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
      guest_name VARCHAR(255),
      guest_email VARCHAR(255),
      invitation_type VARCHAR(50) DEFAULT 'Email',
      sent_date DATE,
      rsvp_status VARCHAR(50) DEFAULT 'Pending',
      message TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE seating (
      id SERIAL PRIMARY KEY,
      event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
      table_number INTEGER,
      table_name VARCHAR(100),
      capacity INTEGER,
      guests_assigned TEXT,
      arrangement_type VARCHAR(50) DEFAULT 'Round',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE entertainment (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      entertainment_type VARCHAR(100),
      duration_hours DECIMAL(4,1),
      cost DECIMAL(10,2),
      description TEXT,
      requirements TEXT,
      contact_info VARCHAR(255),
      rating DECIMAL(3,1),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Seed users
  const hash = await bcrypt.hash('password123', 10);
  await pool.query(`INSERT INTO users (email, password, name) VALUES ('admin@eventplanner.com', $1, 'Admin User')`, [hash]);

  // Seed 15 Events
  await pool.query(`
    INSERT INTO events (name, event_type, date, time, location, description, max_guests, budget, status) VALUES
    ('Annual Tech Conference 2026', 'Conference', '2026-06-15', '09:00 AM', 'San Francisco Convention Center', 'Annual technology conference featuring keynote speakers, workshops, and networking sessions covering AI, cloud computing, and cybersecurity.', 500, 75000.00, 'Planning'),
    ('Smith-Johnson Wedding', 'Wedding', '2026-08-20', '04:00 PM', 'Rosewood Gardens Estate', 'Elegant outdoor wedding ceremony followed by a formal dinner reception with live music and dancing under the stars.', 200, 45000.00, 'Confirmed'),
    ('Corporate Holiday Gala', 'Gala', '2026-12-18', '07:00 PM', 'The Grand Ballroom Hotel', 'Black-tie holiday celebration featuring gourmet dining, live orchestra, awards ceremony, and silent auction.', 300, 55000.00, 'Planning'),
    ('Startup Pitch Night', 'Networking', '2026-04-10', '06:00 PM', 'Innovation Hub Downtown', 'Evening event where 10 startups pitch to investors, followed by networking cocktails and hors doeuvres.', 150, 8000.00, 'Confirmed'),
    ('Summer Music Festival', 'Festival', '2026-07-04', '12:00 PM', 'Lakeside Park Amphitheater', 'All-day outdoor music festival featuring 8 bands, food trucks, craft vendors, and fireworks finale.', 2000, 120000.00, 'Planning'),
    ('Product Launch Event', 'Launch', '2026-05-22', '10:00 AM', 'Metropolitan Arts Center', 'Exclusive product reveal with media coverage, live demonstrations, influencer meet-and-greet, and press conference.', 250, 35000.00, 'Confirmed'),
    ('Charity Fundraiser Dinner', 'Fundraiser', '2026-09-12', '06:30 PM', 'Oceanview Terrace', 'Formal fundraising dinner supporting local education initiatives with guest speakers, auction, and entertainment.', 180, 28000.00, 'Planning'),
    ('Team Building Retreat', 'Corporate', '2026-10-05', '08:00 AM', 'Mountain Lodge Resort', 'Three-day corporate retreat with team-building activities, strategy sessions, outdoor adventures, and bonfire dinners.', 80, 22000.00, 'Draft'),
    ('Art Gallery Opening', 'Exhibition', '2026-03-28', '07:00 PM', 'Modern Art Space Gallery', 'Grand opening featuring 40 contemporary artists, wine reception, live painting demonstrations, and curator talks.', 120, 15000.00, 'Confirmed'),
    ('International Food Fair', 'Festival', '2026-11-08', '11:00 AM', 'City Convention Plaza', 'Multicultural food festival with 25 cuisine stations, cooking demonstrations, cultural performances, and competitions.', 1500, 65000.00, 'Planning'),
    ('Baby Shower Celebration', 'Personal', '2026-04-25', '02:00 PM', 'Garden Pavilion Restaurant', 'Intimate afternoon celebration with themed decorations, games, catering, and professional photography.', 40, 3500.00, 'Confirmed'),
    ('Annual Awards Ceremony', 'Awards', '2026-11-20', '06:00 PM', 'Crystal Palace Events', 'Prestigious awards night honoring industry leaders with red carpet, dinner, entertainment, and trophy presentation.', 350, 48000.00, 'Planning'),
    ('Wellness & Yoga Retreat', 'Retreat', '2026-05-15', '07:00 AM', 'Serenity Spa Resort', 'Weekend wellness retreat featuring yoga sessions, meditation workshops, healthy cuisine, and spa treatments.', 60, 18000.00, 'Draft'),
    ('Halloween Costume Party', 'Party', '2026-10-31', '08:00 PM', 'The Underground Venue', 'Spooky themed party with costume contest, DJ, haunted house experience, themed cocktails, and photo booth.', 200, 12000.00, 'Planning'),
    ('Business Networking Brunch', 'Networking', '2026-06-08', '10:30 AM', 'Skyline Rooftop Lounge', 'Professional networking brunch with structured introductions, keynote speaker, gourmet brunch, and business card exchange.', 100, 6500.00, 'Confirmed')
  `);

  // Seed 15 Venues
  await pool.query(`
    INSERT INTO venues (name, address, capacity, venue_type, hourly_rate, amenities, contact_phone, contact_email, rating) VALUES
    ('The Grand Ballroom Hotel', '123 Luxury Ave, San Francisco, CA 94102', 500, 'Hotel Ballroom', 2500.00, 'Stage, Sound System, Projector, Dance Floor, Bar, Kitchen, Coat Check, Valet Parking', '415-555-0101', 'events@grandballroom.com', 4.8),
    ('Rosewood Gardens Estate', '456 Garden Lane, Napa Valley, CA 94558', 300, 'Garden Estate', 3500.00, 'Outdoor Garden, Gazebo, Bridal Suite, Catering Kitchen, Parking, Restrooms, Lighting', '707-555-0102', 'weddings@rosewoodgardens.com', 4.9),
    ('Innovation Hub Downtown', '789 Tech Blvd, San Francisco, CA 94105', 200, 'Conference Center', 1200.00, 'High-Speed WiFi, Multiple Screens, Breakout Rooms, Coffee Bar, Whiteboard Walls', '415-555-0103', 'book@innovationhub.com', 4.5),
    ('Lakeside Park Amphitheater', '321 Lakeshore Dr, Oakland, CA 94612', 5000, 'Outdoor Amphitheater', 5000.00, 'Main Stage, Backstage Areas, Food Court Space, Parking Lots, Security Station, First Aid', '510-555-0104', 'events@lakesideamp.com', 4.7),
    ('Metropolitan Arts Center', '555 Arts Way, San Jose, CA 95110', 400, 'Arts Center', 1800.00, 'Gallery Spaces, Theater, Green Room, AV Equipment, Loading Dock, Elevator Access', '408-555-0105', 'rentals@metroarts.com', 4.6),
    ('Oceanview Terrace', '777 Coastal Hwy, Half Moon Bay, CA 94019', 250, 'Waterfront Venue', 2800.00, 'Ocean Views, Heated Patio, Indoor Salon, Full Kitchen, Bar Area, Sunset Deck', '650-555-0106', 'events@oceanviewterrace.com', 4.9),
    ('Mountain Lodge Resort', '999 Summit Rd, Lake Tahoe, CA 96150', 150, 'Resort', 4000.00, 'Conference Room, Cabins, Restaurant, Pool, Hiking Trails, Bonfire Pit, Spa', '530-555-0107', 'groups@mountainlodge.com', 4.8),
    ('Modern Art Space Gallery', '222 Gallery St, San Francisco, CA 94108', 150, 'Gallery', 900.00, 'White Walls, Track Lighting, Polished Floors, Wine Bar, Sound System, Climate Control', '415-555-0108', 'space@modernartgallery.com', 4.4),
    ('City Convention Plaza', '100 Convention Blvd, San Francisco, CA 94103', 3000, 'Convention Center', 8000.00, 'Exhibition Halls, Meeting Rooms, Loading Docks, WiFi, Food Courts, Parking Garage', '415-555-0109', 'sales@cityconvention.com', 4.3),
    ('Garden Pavilion Restaurant', '444 Bloom Rd, Sausalito, CA 94965', 60, 'Restaurant', 500.00, 'Private Dining Room, Garden Patio, Full Kitchen, Bar, AV Screen, Valet', '415-555-0110', 'private@gardenpavilion.com', 4.7),
    ('Crystal Palace Events', '888 Crystal Dr, San Jose, CA 95112', 600, 'Event Center', 3000.00, 'Crystal Chandeliers, Stage, Dance Floor, VIP Lounge, Catering Kitchen, Red Carpet Area', '408-555-0111', 'book@crystalpalace.com', 4.6),
    ('Serenity Spa Resort', '333 Zen Way, Carmel, CA 93923', 100, 'Spa Resort', 3500.00, 'Yoga Studio, Meditation Garden, Organic Kitchen, Spa Rooms, Pool, Nature Trails', '831-555-0112', 'retreats@serenityresort.com', 4.9),
    ('The Underground Venue', '666 Basement Ave, Oakland, CA 94607', 300, 'Nightclub', 1500.00, 'DJ Booth, Dance Floor, Laser Lights, Fog Machine, 3 Bars, VIP Section, Photo Booth', '510-555-0113', 'events@undergroundvenue.com', 4.3),
    ('Skyline Rooftop Lounge', '1000 High St, San Francisco, CA 94104', 120, 'Rooftop', 1800.00, 'Panoramic Views, Retractable Roof, Heaters, Bar, Lounge Furniture, Sound System', '415-555-0114', 'rooftop@skylinelounge.com', 4.8),
    ('Heritage Mansion', '1200 Victorian Way, Sacramento, CA 95814', 200, 'Historic Mansion', 2200.00, 'Grand Staircase, Ballroom, Library, Courtyard, Bridal Suite, Period Furniture', '916-555-0115', 'events@heritagemansion.com', 4.7)
  `);

  // Seed 15 Guests
  await pool.query(`
    INSERT INTO guests (name, email, phone, event_id, rsvp_status, dietary_restrictions, plus_ones, table_number, notes) VALUES
    ('James Anderson', 'james.anderson@email.com', '415-555-1001', 1, 'Confirmed', 'None', 1, 1, 'VIP speaker - needs backstage access'),
    ('Maria Garcia', 'maria.garcia@email.com', '415-555-1002', 1, 'Confirmed', 'Vegetarian', 0, 2, 'Workshop presenter - Room B'),
    ('Robert Chen', 'robert.chen@email.com', '510-555-1003', 2, 'Confirmed', 'Gluten-free', 1, 3, 'Best man - needs early arrival'),
    ('Sarah Williams', 'sarah.w@email.com', '650-555-1004', 2, 'Confirmed', 'Vegan', 2, 4, 'Maid of honor - coordinating bridesmaids'),
    ('David Kim', 'david.kim@email.com', '408-555-1005', 3, 'Pending', 'None', 1, 5, 'Department head - presenting award'),
    ('Emily Brown', 'emily.brown@email.com', '415-555-1006', 3, 'Confirmed', 'Nut allergy', 0, 6, 'Board member'),
    ('Michael Johnson', 'michael.j@email.com', '707-555-1007', 4, 'Confirmed', 'None', 0, 1, 'Angel investor - front row seating'),
    ('Lisa Park', 'lisa.park@email.com', '415-555-1008', 4, 'Declined', 'Kosher', 1, 2, 'Sent regrets - traveling abroad'),
    ('Thomas Wright', 'thomas.w@email.com', '510-555-1009', 5, 'Confirmed', 'None', 3, 1, 'Bringing family - needs kids area info'),
    ('Amanda Lopez', 'amanda.l@email.com', '408-555-1010', 6, 'Confirmed', 'Dairy-free', 0, 3, 'Press - needs media badge'),
    ('Christopher Lee', 'chris.lee@email.com', '831-555-1011', 7, 'Pending', 'Pescatarian', 1, 7, 'Major donor - recognition needed'),
    ('Jennifer Taylor', 'jen.taylor@email.com', '916-555-1012', 8, 'Confirmed', 'None', 0, 1, 'Team lead - organizing activities'),
    ('Daniel Martinez', 'daniel.m@email.com', '415-555-1013', 9, 'Confirmed', 'Vegetarian', 1, 2, 'Art collector - interested in purchasing'),
    ('Rachel Green', 'rachel.g@email.com', '650-555-1014', 10, 'Confirmed', 'Halal', 2, 4, 'Food blogger - will cover event'),
    ('Kevin White', 'kevin.w@email.com', '510-555-1015', 11, 'Confirmed', 'None', 1, 1, 'Close family friend')
  `);

  // Seed 15 Catering Menus
  await pool.query(`
    INSERT INTO catering_menus (name, cuisine_type, price_per_person, min_guests, max_guests, menu_items, dietary_options, vendor_name, rating) VALUES
    ('Executive Elegance Package', 'French', 85.00, 50, 300, 'Amuse-bouche, French onion soup, Beef bourguignon, Crème brûlée, Artisan cheese board', 'Vegetarian, Vegan, Gluten-free options available', 'Le Petit Chef Catering', 4.9),
    ('Mediterranean Feast', 'Mediterranean', 55.00, 30, 200, 'Hummus trio, Greek salad, Lamb souvlaki, Grilled sea bass, Baklava platter', 'Vegetarian, Vegan, Halal options', 'Olive & Vine Catering', 4.7),
    ('Asian Fusion Experience', 'Asian Fusion', 65.00, 40, 250, 'Dim sum selection, Miso glazed salmon, Thai basil chicken, Matcha tiramisu', 'Vegetarian, Gluten-free, Nut-free options', 'Pacific Rim Kitchen', 4.8),
    ('Texas BBQ Bonanza', 'BBQ', 45.00, 20, 500, 'Smoked brisket, Pulled pork, Mac and cheese, Cornbread, Pecan pie', 'Gluten-free sides available', 'Smokin Joes BBQ', 4.6),
    ('Italian Garden Party', 'Italian', 60.00, 25, 200, 'Bruschetta trio, Caesar salad, Chicken parmigiana, Tiramisu, Espresso bar', 'Vegetarian, Vegan pasta options', 'Bella Cucina Events', 4.8),
    ('Farm-to-Table Organic', 'Organic', 75.00, 20, 150, 'Seasonal soup, Harvest salad, Grass-fed filet, Organic roasted vegetables, Fruit tart', 'Vegetarian, Vegan, All organic ingredients', 'Green Harvest Catering', 4.9),
    ('Indian Royal Banquet', 'Indian', 50.00, 30, 300, 'Samosa selection, Butter chicken, Lamb biryani, Naan bread, Gulab jamun', 'Vegetarian, Vegan, Halal, Jain options', 'Royal Spice Kitchen', 4.7),
    ('Seafood Spectacular', 'Seafood', 90.00, 30, 200, 'Oyster bar, Lobster bisque, Grilled swordfish, Crab cakes, Key lime pie', 'Gluten-free, Dairy-free options', 'Ocean Fresh Catering', 4.8),
    ('Mexican Fiesta Buffet', 'Mexican', 40.00, 25, 400, 'Guacamole station, Street tacos, Enchiladas, Churros, Margarita bar', 'Vegetarian, Vegan, Gluten-free tortillas', 'Casa de Sabor', 4.5),
    ('Cocktail Reception Bites', 'International', 35.00, 50, 500, 'Mini sliders, Shrimp cocktail, Caprese skewers, Spring rolls, Chocolate truffles', 'Vegetarian, Vegan, Gluten-free options', 'Savory Bites Co.', 4.6),
    ('Vegan Paradise Menu', 'Vegan', 55.00, 20, 200, 'Cauliflower wings, Quinoa bowl, Mushroom Wellington, Coconut curry, Vegan cheesecake', 'All vegan, Gluten-free, Nut-free available', 'Plant Power Catering', 4.7),
    ('Brunch Delights', 'Brunch', 38.00, 15, 150, 'Eggs Benedict, Avocado toast, Belgian waffles, Fruit parfait, Mimosa bar', 'Vegetarian, Vegan, Gluten-free options', 'Morning Glory Catering', 4.6),
    ('Japanese Omakase', 'Japanese', 95.00, 20, 100, 'Edamame, Sashimi platter, Wagyu beef, Tempura, Mochi ice cream', 'Gluten-free soy available, Vegetarian sushi', 'Sakura Dining Events', 4.9),
    ('Southern Comfort Menu', 'Southern', 42.00, 30, 300, 'Fried green tomatoes, Shrimp and grits, Fried chicken, Collard greens, Peach cobbler', 'Gluten-free sides available', 'Sweet Tea Catering', 4.5),
    ('Dessert & Sweets Bar', 'Dessert', 25.00, 20, 500, 'Chocolate fountain, Macaron tower, Mini cheesecakes, Gelato station, Cookie bar', 'Vegan, Gluten-free, Sugar-free options', 'Sugar Rush Events', 4.8)
  `);

  // Seed 15 Vendors
  await pool.query(`
    INSERT INTO vendors (name, service_type, contact_email, contact_phone, hourly_rate, rating, description, availability, portfolio_url) VALUES
    ('Pixel Perfect Photography', 'Photography', 'info@pixelperfect.com', '415-555-2001', 250.00, 4.9, 'Award-winning event photography with 15+ years of experience. Specializing in weddings, corporate events, and galas.', 'Available', 'https://pixelperfect.com/portfolio'),
    ('Harmony Live Band', 'Live Music', 'booking@harmonylive.com', '510-555-2002', 500.00, 4.8, '8-piece versatile band covering jazz, pop, rock, and classical. Perfect for weddings and corporate events.', 'Available', 'https://harmonylive.com'),
    ('DJ Electro Beats', 'DJ Services', 'dj@electrobeats.com', '408-555-2003', 200.00, 4.6, 'Professional DJ with state-of-the-art equipment. Specializing in corporate events, parties, and festivals.', 'Available', 'https://djelectrobeats.com'),
    ('Bloom & Petal Florals', 'Floral Design', 'orders@bloompetal.com', '707-555-2004', 150.00, 4.9, 'Luxury floral arrangements for all occasions. Custom centerpieces, bouquets, and venue decoration.', 'Available', 'https://bloompetal.com/gallery'),
    ('Cinematic Dreams Video', 'Videography', 'hello@cinematicdreams.com', '415-555-2005', 300.00, 4.7, 'Cinematic event videography with drone footage, same-day edits, and highlight reels.', 'Booked', 'https://cinematicdreams.com'),
    ('Party Décor Plus', 'Decoration', 'design@partydecor.com', '650-555-2006', 175.00, 4.5, 'Full event decoration services including lighting, draping, themed setups, and prop rentals.', 'Available', 'https://partydecorplus.com'),
    ('Sweet Moments Bakery', 'Bakery', 'cakes@sweetmoments.com', '831-555-2007', 100.00, 4.8, 'Custom wedding cakes, dessert tables, and pastry catering. Award-winning pastry chef.', 'Available', 'https://sweetmomentsbakery.com'),
    ('Sound & Light Pro', 'AV Equipment', 'rentals@soundlightpro.com', '916-555-2008', 350.00, 4.6, 'Professional audio-visual equipment rental and setup. PA systems, projectors, lighting rigs, and LED walls.', 'Available', 'https://soundlightpro.com'),
    ('Elite Valet Services', 'Valet Parking', 'service@elitevalet.com', '415-555-2009', 125.00, 4.4, 'Professional valet parking for events up to 500 cars. Uniformed staff, insurance included.', 'Available', 'https://elitevaletservice.com'),
    ('Guardian Event Security', 'Security', 'ops@guardiansecurity.com', '510-555-2010', 175.00, 4.7, 'Licensed event security with crowd management, VIP protection, and access control.', 'Available', 'https://guardiansecurity.com'),
    ('Elegant Invitations Co.', 'Stationery', 'design@elegantinvites.com', '408-555-2011', 80.00, 4.8, 'Custom invitation design, printing, and calligraphy. Digital and physical invitations available.', 'Available', 'https://elegantinvitations.com'),
    ('Sparkle Clean Events', 'Cleaning', 'book@sparkleclean.com', '650-555-2012', 90.00, 4.5, 'Pre and post-event cleaning services. Setup assistance, breakdown, and waste management.', 'Available', 'https://sparklecleanevents.com'),
    ('TransLux Transportation', 'Transportation', 'rides@translux.com', '415-555-2013', 200.00, 4.7, 'Luxury transportation including limousines, party buses, and shuttle services for events.', 'Available', 'https://translux.com'),
    ('The Photo Booth Company', 'Photo Booth', 'fun@photoboothco.com', '510-555-2014', 175.00, 4.6, 'Modern photo booths with props, custom backdrops, instant printing, and social media sharing.', 'Available', 'https://photoboothcompany.com'),
    ('Gourmet Ice Cream Cart', 'Catering', 'scoop@gourmeticecream.com', '831-555-2015', 95.00, 4.8, 'Artisan ice cream cart service with 20+ flavors, custom sundae bar, and dairy-free options.', 'Available', 'https://gourmeticecreamcart.com')
  `);

  // Seed 15 Budgets
  await pool.query(`
    INSERT INTO budgets (event_id, category, estimated_cost, actual_cost, vendor_name, notes, status) VALUES
    (1, 'Venue Rental', 15000.00, 14500.00, 'City Convention Plaza', 'Full-day rental including setup time', 'Paid'),
    (1, 'Catering', 25000.00, 0.00, 'Pacific Rim Kitchen', 'Asian fusion menu for 500 guests', 'Pending'),
    (1, 'AV Equipment', 8000.00, 7500.00, 'Sound & Light Pro', 'Full AV setup with LED wall', 'Paid'),
    (2, 'Venue Rental', 10500.00, 10500.00, 'Rosewood Gardens Estate', '6-hour venue rental', 'Paid'),
    (2, 'Photography', 5000.00, 0.00, 'Pixel Perfect Photography', '8 hours coverage plus album', 'Deposit Paid'),
    (2, 'Catering', 17000.00, 0.00, 'Le Petit Chef Catering', 'French menu for 200 guests', 'Pending'),
    (2, 'Florals', 4500.00, 4200.00, 'Bloom & Petal Florals', 'Centerpieces, bouquets, venue decoration', 'Paid'),
    (3, 'Venue Rental', 12500.00, 0.00, 'The Grand Ballroom Hotel', 'Evening gala 6 hours', 'Deposit Paid'),
    (3, 'Live Music', 6000.00, 0.00, 'Harmony Live Band', '4 hours live performance', 'Pending'),
    (3, 'Catering', 18000.00, 0.00, 'Bella Cucina Events', 'Italian menu for 300 guests', 'Pending'),
    (4, 'Venue Rental', 2400.00, 2400.00, 'Innovation Hub Downtown', '2-hour evening rental', 'Paid'),
    (4, 'Catering', 3500.00, 0.00, 'Savory Bites Co.', 'Cocktail reception bites', 'Pending'),
    (5, 'Venue Rental', 40000.00, 20000.00, 'Lakeside Park Amphitheater', 'Full day outdoor festival', 'Deposit Paid'),
    (5, 'Sound Equipment', 25000.00, 0.00, 'Sound & Light Pro', 'Main stage and side stage setup', 'Pending'),
    (6, 'Venue Rental', 9000.00, 9000.00, 'Metropolitan Arts Center', '5-hour event rental', 'Paid')
  `);

  // Seed 15 Tasks
  await pool.query(`
    INSERT INTO tasks (event_id, title, description, assigned_to, due_date, priority, status) VALUES
    (1, 'Finalize speaker lineup', 'Confirm all keynote speakers and workshop presenters. Send contract agreements.', 'Sarah Williams', '2026-04-15', 'High', 'In Progress'),
    (1, 'Design conference program', 'Create detailed program booklet with schedule, speaker bios, and sponsor logos.', 'Design Team', '2026-05-01', 'Medium', 'Pending'),
    (1, 'Setup registration system', 'Configure online registration with early bird and VIP ticket tiers.', 'Tech Team', '2026-03-30', 'High', 'Completed'),
    (2, 'Book officiant', 'Confirm wedding officiant and review ceremony script.', 'Maria Garcia', '2026-06-01', 'High', 'In Progress'),
    (2, 'Final dress fitting', 'Schedule final fitting for bride and bridesmaids at the boutique.', 'Sarah Williams', '2026-08-01', 'Medium', 'Pending'),
    (2, 'Send invitations', 'Mail physical invitations to all guests. Include RSVP cards and meal selection.', 'Emily Brown', '2026-05-20', 'High', 'Completed'),
    (3, 'Select award recipients', 'Finalize nominees and winners for each award category with committee.', 'David Kim', '2026-10-15', 'High', 'Pending'),
    (3, 'Arrange entertainment', 'Book live orchestra and MC for the gala evening program.', 'Lisa Park', '2026-09-01', 'Medium', 'In Progress'),
    (4, 'Curate startup presenters', 'Review applications and select 10 startups for pitch presentations.', 'Michael Johnson', '2026-03-15', 'High', 'Completed'),
    (5, 'Obtain permits', 'File for outdoor event permits, noise permits, and liquor license.', 'Operations Team', '2026-04-01', 'High', 'In Progress'),
    (5, 'Book food trucks', 'Confirm 12 food trucks with diverse cuisine options for the festival.', 'Thomas Wright', '2026-05-15', 'Medium', 'Pending'),
    (6, 'Prepare demo units', 'Set up 5 working demo stations with the new product for hands-on experience.', 'Product Team', '2026-05-15', 'High', 'In Progress'),
    (7, 'Create auction catalog', 'Photograph and catalog all silent auction items with descriptions and minimum bids.', 'Amanda Lopez', '2026-08-01', 'Medium', 'Pending'),
    (8, 'Plan team activities', 'Design 6 team-building exercises including outdoor and indoor options.', 'Jennifer Taylor', '2026-09-01', 'Medium', 'In Progress'),
    (9, 'Hang artwork', 'Install all 40 pieces with proper lighting and description cards.', 'Gallery Staff', '2026-03-25', 'High', 'Pending')
  `);

  // Seed 15 Invitations
  await pool.query(`
    INSERT INTO invitations (event_id, guest_name, guest_email, invitation_type, sent_date, rsvp_status, message) VALUES
    (1, 'James Anderson', 'james.anderson@email.com', 'Email', '2026-03-01', 'Accepted', 'You are cordially invited to the Annual Tech Conference 2026 as our keynote speaker.'),
    (1, 'Maria Garcia', 'maria.garcia@email.com', 'Email', '2026-03-01', 'Accepted', 'We are pleased to invite you as a workshop presenter at the Tech Conference.'),
    (2, 'Robert Chen', 'robert.chen@email.com', 'Physical', '2026-05-20', 'Accepted', 'Together with their families, the Smiths and Johnsons request the honor of your presence.'),
    (2, 'Sarah Williams', 'sarah.w@email.com', 'Physical', '2026-05-20', 'Accepted', 'You are invited to celebrate the union of love at the Smith-Johnson Wedding.'),
    (3, 'David Kim', 'david.kim@email.com', 'Email', '2026-10-01', 'Pending', 'You are invited to the Corporate Holiday Gala - an evening of celebration and recognition.'),
    (3, 'Emily Brown', 'emily.brown@email.com', 'Email', '2026-10-01', 'Accepted', 'Please join us for an elegant evening at the Corporate Holiday Gala.'),
    (4, 'Michael Johnson', 'michael.j@email.com', 'Email', '2026-03-15', 'Accepted', 'Exclusive invitation to Startup Pitch Night - discover the next big thing.'),
    (4, 'Lisa Park', 'lisa.park@email.com', 'Email', '2026-03-15', 'Declined', 'You are invited to evaluate promising startups at our Pitch Night event.'),
    (5, 'Thomas Wright', 'thomas.w@email.com', 'Digital', '2026-05-01', 'Accepted', 'Get your tickets to the Summer Music Festival - a day of music, food, and fun!'),
    (6, 'Amanda Lopez', 'amanda.l@email.com', 'Email', '2026-04-15', 'Accepted', 'Exclusive media invitation to the product launch event. Press badge included.'),
    (7, 'Christopher Lee', 'chris.lee@email.com', 'Physical', '2026-07-15', 'Pending', 'Your presence is requested at the Charity Fundraiser Dinner supporting education.'),
    (8, 'Jennifer Taylor', 'jen.taylor@email.com', 'Email', '2026-08-15', 'Accepted', 'Join your team for an unforgettable retreat at Mountain Lodge Resort.'),
    (9, 'Daniel Martinez', 'daniel.m@email.com', 'Email', '2026-03-10', 'Accepted', 'Exclusive preview invitation to the Modern Art Space Gallery grand opening.'),
    (10, 'Rachel Green', 'rachel.g@email.com', 'Digital', '2026-09-01', 'Accepted', 'Special blogger invitation to the International Food Fair - all-access pass included.'),
    (11, 'Kevin White', 'kevin.w@email.com', 'Physical', '2026-03-20', 'Accepted', 'You are lovingly invited to celebrate the upcoming arrival at our baby shower.')
  `);

  // Seed 15 Seating arrangements
  await pool.query(`
    INSERT INTO seating (event_id, table_number, table_name, capacity, guests_assigned, arrangement_type, notes) VALUES
    (2, 1, 'Head Table', 8, 'Bride, Groom, Best Man, Maid of Honor, Parents', 'Long', 'Elevated position, center of room'),
    (2, 2, 'Rose Table', 10, 'Smith Family Members', 'Round', 'Near head table, left side'),
    (2, 3, 'Lily Table', 10, 'Johnson Family Members', 'Round', 'Near head table, right side'),
    (2, 4, 'Orchid Table', 10, 'College Friends Group', 'Round', 'Near dance floor'),
    (2, 5, 'Daisy Table', 10, 'Work Colleagues', 'Round', 'Center of room'),
    (3, 1, 'Executive Table', 12, 'CEO, CFO, Board Members', 'Long', 'Front of stage, premium seating'),
    (3, 2, 'Leadership Table', 10, 'Department Heads', 'Round', 'Second row, left'),
    (3, 3, 'Innovation Table', 10, 'R&D Team Leaders', 'Round', 'Second row, right'),
    (3, 4, 'Sales Table', 10, 'Top Sales Performers', 'Round', 'Third row'),
    (3, 5, 'Marketing Table', 10, 'Marketing Team', 'Round', 'Third row'),
    (7, 1, 'Patron Table', 8, 'Major Donors ($10K+)', 'Round', 'Premium front position near stage'),
    (7, 2, 'Benefactor Table', 10, 'Corporate Sponsors', 'Round', 'Left side, good stage view'),
    (7, 3, 'Supporter Table', 10, 'Individual Donors', 'Round', 'Center section'),
    (10, 1, 'Judges Table', 6, 'Competition Judges', 'Long', 'Elevated near main stage'),
    (10, 2, 'VIP Tasting Table', 8, 'Food Critics and Bloggers', 'Round', 'Central location for easy access')
  `);

  // Seed 15 Entertainment
  await pool.query(`
    INSERT INTO entertainment (name, entertainment_type, duration_hours, cost, description, requirements, contact_info, rating) VALUES
    ('The Swing Kings', 'Live Band', 4.0, 3500.00, 'Vintage swing and jazz band perfect for formal events and galas. 6-piece ensemble.', 'Stage (min 12x8ft), power outlets, 2 monitors', 'booking@swingkings.com', 4.8),
    ('DJ Marcus Wave', 'DJ', 5.0, 1500.00, 'High-energy DJ specializing in corporate events, weddings, and parties. Custom playlists.', 'DJ booth, power supply, 2 speaker stands', 'marcus@djwave.com', 4.6),
    ('Cirque Mystique Performers', 'Acrobatics', 2.0, 5000.00, 'Stunning aerial acrobatics and contortion show. 4 performers with custom costumes.', 'High ceiling (min 20ft), rigging points, performance area 15x15ft', 'book@cirquemystique.com', 4.9),
    ('Comedy Hour with Dave Miller', 'Stand-up Comedy', 1.5, 2000.00, 'Award-winning comedian perfect for corporate events. Clean humor, audience interaction.', 'Stage, spotlight, wireless microphone', 'agent@davemiller.com', 4.7),
    ('Magic of Martin Chen', 'Magician', 2.0, 1800.00, 'Close-up and stage magic. Interactive illusions perfect for cocktail hours and dinners.', 'Small table for close-up, stage for show, good lighting', 'martin@magicchen.com', 4.8),
    ('Salsa Caliente Dancers', 'Dance Performance', 1.5, 2500.00, 'Professional Latin dance troupe with 6 dancers. Includes audience participation segment.', 'Dance floor (min 15x15ft), sound system, changing room', 'info@salsacaliente.com', 4.7),
    ('The String Quartet Elite', 'Classical Music', 3.0, 2200.00, 'Elegant string quartet performing classical and contemporary arrangements for ceremonies.', 'Chairs, music stands, quiet space, no wind if outdoor', 'book@stringquartet.com', 4.9),
    ('Sketch Artist - Julia Ross', 'Caricature Artist', 4.0, 800.00, 'Live caricature sketches for guests. Fun keepsake drawings in color or black and white.', 'Table, chair, good lighting, easel', 'julia@sketchartist.com', 4.5),
    ('Fire & Ice Show', 'Fire Performance', 1.0, 3000.00, 'Dramatic fire dancing and LED performance. 3 performers with choreographed routines.', 'Outdoor space, 20ft clearance, fire extinguisher, wind check', 'shows@fireandice.com', 4.8),
    ('Trivia Master Events', 'Interactive Games', 2.0, 600.00, 'Custom trivia and game show experience with professional host. Custom questions available.', 'Screen/projector, sound system, tables for teams', 'host@triviamaster.com', 4.4),
    ('Face Paint Fantasy', 'Face Painting', 4.0, 500.00, 'Professional face painting for all ages. Festival designs, superhero themes, and elegant masquerade styles.', 'Table, chairs, good lighting, water access', 'art@facepaintfantasy.com', 4.6),
    ('Virtual Reality Experience', 'Technology', 3.0, 2500.00, 'VR gaming stations with multiplayer experiences. 4 stations with latest headsets and games.', 'Tables, power outlets, 10x10ft per station, WiFi', 'events@vrexperience.com', 4.5),
    ('The Balloon Artist', 'Balloon Art', 3.0, 700.00, 'Custom balloon sculptures, arches, and interactive balloon twisting for guests.', 'Indoor space (no sharp objects), power for pump', 'create@balloonartist.com', 4.6),
    ('Jazz Lounge Trio', 'Live Music', 3.0, 1800.00, 'Sophisticated jazz trio (piano, bass, drums) perfect for cocktail hours and intimate events.', 'Piano or keyboard, small stage area, power supply', 'trio@jazzlounge.com', 4.8),
    ('LED Robot Dancers', 'Dance Performance', 1.5, 4000.00, 'Futuristic LED-suit dancers with synchronized choreography. Perfect for tech events and galas.', 'Dark venue capability, 15x15ft performance area, music sync', 'book@ledrobots.com', 4.7)
  `);

  console.log('✅ Database seeded successfully with 15 items per table!');
  await pool.end();
}

seed().catch(err => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
