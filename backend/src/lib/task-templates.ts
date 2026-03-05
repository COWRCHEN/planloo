/**
 * Pre-Built Task Templates
 *
 * Static template data for common event types.
 * Each template task includes a `daysBeforeEvent` offset used to compute
 * actual due dates relative to the event's startDate.
 */

export interface TemplateTask {
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  daysBeforeEvent: number;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  tasks: TemplateTask[];
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'wedding',
    name: 'Wedding',
    description: 'Complete wedding planning checklist with 18 essential tasks.',
    tasks: [
      { title: 'Set a budget', description: 'Determine total wedding budget and allocate across categories.', category: 'Planning', priority: 'high', daysBeforeEvent: 365 },
      { title: 'Create guest list', description: 'Draft an initial guest list with estimated headcount.', category: 'Planning', priority: 'high', daysBeforeEvent: 360 },
      { title: 'Book venue', description: 'Research, visit, and book ceremony and reception venues.', category: 'Venue', priority: 'high', daysBeforeEvent: 330 },
      { title: 'Hire photographer/videographer', description: 'Review portfolios, meet with candidates, and book.', category: 'Vendors', priority: 'high', daysBeforeEvent: 300 },
      { title: 'Book caterer', description: 'Select catering company and plan initial menu.', category: 'Catering', priority: 'high', daysBeforeEvent: 270 },
      { title: 'Choose wedding party', description: 'Select bridesmaids, groomsmen, and other roles.', category: 'Planning', priority: 'medium', daysBeforeEvent: 270 },
      { title: 'Book entertainment/DJ', description: 'Find and hire DJ or band for reception.', category: 'Entertainment', priority: 'medium', daysBeforeEvent: 240 },
      { title: 'Shop for wedding attire', description: 'Purchase wedding dress, suit, and accessories.', category: 'Attire', priority: 'high', daysBeforeEvent: 210 },
      { title: 'Order invitations', description: 'Design and order wedding invitations and RSVP cards.', category: 'Stationery', priority: 'medium', daysBeforeEvent: 180 },
      { title: 'Book florist', description: 'Select florist and plan floral arrangements.', category: 'Decorations', priority: 'medium', daysBeforeEvent: 180 },
      { title: 'Plan honeymoon', description: 'Research destinations and book travel.', category: 'Travel', priority: 'low', daysBeforeEvent: 150 },
      { title: 'Send invitations', description: 'Mail out invitations and track RSVPs.', category: 'Stationery', priority: 'high', daysBeforeEvent: 90 },
      { title: 'Finalize menu', description: 'Confirm final menu selections with caterer.', category: 'Catering', priority: 'medium', daysBeforeEvent: 60 },
      { title: 'Arrange transportation', description: 'Book limos or transportation for wedding day.', category: 'Logistics', priority: 'low', daysBeforeEvent: 45 },
      { title: 'Final dress fitting', description: 'Complete final alterations and fitting.', category: 'Attire', priority: 'medium', daysBeforeEvent: 30 },
      { title: 'Confirm final guest count', description: 'Finalize RSVPs and provide count to vendors.', category: 'Planning', priority: 'high', daysBeforeEvent: 14 },
      { title: 'Rehearsal dinner', description: 'Plan and host rehearsal dinner.', category: 'Events', priority: 'medium', daysBeforeEvent: 1 },
      { title: 'Prepare day-of timeline', description: 'Create detailed timeline for the wedding day.', category: 'Planning', priority: 'high', daysBeforeEvent: 7 },
    ],
  },
  {
    id: 'birthday',
    name: 'Birthday Party',
    description: 'Birthday party planning checklist with 10 essential tasks.',
    tasks: [
      { title: 'Set a budget', description: 'Determine party budget for venue, food, and entertainment.', category: 'Planning', priority: 'high', daysBeforeEvent: 60 },
      { title: 'Choose theme', description: 'Decide on a party theme and color scheme.', category: 'Planning', priority: 'medium', daysBeforeEvent: 45 },
      { title: 'Book venue', description: 'Reserve the party venue or set up home space.', category: 'Venue', priority: 'high', daysBeforeEvent: 40 },
      { title: 'Create guest list & send invitations', description: 'Compile guest list and send out invitations.', category: 'Planning', priority: 'high', daysBeforeEvent: 30 },
      { title: 'Order cake', description: 'Design and order the birthday cake.', category: 'Catering', priority: 'high', daysBeforeEvent: 14 },
      { title: 'Plan food & drinks', description: 'Plan menu, order catering or shop for supplies.', category: 'Catering', priority: 'medium', daysBeforeEvent: 14 },
      { title: 'Book entertainment', description: 'Hire DJ, magician, or plan activities and games.', category: 'Entertainment', priority: 'medium', daysBeforeEvent: 21 },
      { title: 'Buy decorations', description: 'Purchase balloons, banners, tableware, and decorations.', category: 'Decorations', priority: 'medium', daysBeforeEvent: 7 },
      { title: 'Prepare party favors', description: 'Assemble goodie bags or thank-you gifts.', category: 'Decorations', priority: 'low', daysBeforeEvent: 3 },
      { title: 'Set up party space', description: 'Decorate venue and arrange tables/seating.', category: 'Logistics', priority: 'high', daysBeforeEvent: 0 },
    ],
  },
  {
    id: 'corporate',
    name: 'Corporate Event',
    description: 'Corporate event planning checklist with 12 essential tasks.',
    tasks: [
      { title: 'Define objectives & budget', description: 'Clarify event goals, target audience, and budget.', category: 'Planning', priority: 'high', daysBeforeEvent: 90 },
      { title: 'Book venue', description: 'Research and reserve event venue.', category: 'Venue', priority: 'high', daysBeforeEvent: 75 },
      { title: 'Confirm speakers/presenters', description: 'Invite and confirm keynote speakers or panelists.', category: 'Speakers', priority: 'high', daysBeforeEvent: 60 },
      { title: 'Arrange AV & tech setup', description: 'Book audiovisual equipment, projectors, and microphones.', category: 'Technology', priority: 'high', daysBeforeEvent: 45 },
      { title: 'Book catering', description: 'Select caterer and plan menu for meals/refreshments.', category: 'Catering', priority: 'medium', daysBeforeEvent: 45 },
      { title: 'Design event branding', description: 'Create event logo, banners, name badges, and signage.', category: 'Branding', priority: 'medium', daysBeforeEvent: 40 },
      { title: 'Set up registration', description: 'Create registration page and attendee management system.', category: 'Registration', priority: 'high', daysBeforeEvent: 35 },
      { title: 'Send invitations', description: 'Email invitations and promote through relevant channels.', category: 'Marketing', priority: 'high', daysBeforeEvent: 30 },
      { title: 'Prepare event materials', description: 'Print agendas, handouts, name badges, and presentation slides.', category: 'Materials', priority: 'medium', daysBeforeEvent: 7 },
      { title: 'Confirm final headcount', description: 'Finalize attendee count and share with vendors.', category: 'Planning', priority: 'high', daysBeforeEvent: 5 },
      { title: 'Conduct venue walkthrough', description: 'Visit venue for final walkthrough and setup planning.', category: 'Venue', priority: 'medium', daysBeforeEvent: 3 },
      { title: 'Day-of coordination', description: 'Manage registration desk, AV checks, and vendor coordination.', category: 'Logistics', priority: 'high', daysBeforeEvent: 0 },
    ],
  },
  {
    id: 'holiday_party',
    name: 'Holiday Party',
    description: 'Holiday party planning checklist with 10 essential tasks.',
    tasks: [
      { title: 'Set budget', description: 'Determine total budget for venue, food, drinks, and decorations.', category: 'Planning', priority: 'high', daysBeforeEvent: 60 },
      { title: 'Choose venue', description: 'Decide between home, rented space, or restaurant and make a reservation.', category: 'Venue', priority: 'high', daysBeforeEvent: 50 },
      { title: 'Send save-the-dates', description: 'Alert guests early — holiday calendars fill up fast.', category: 'Planning', priority: 'high', daysBeforeEvent: 45 },
      { title: 'Plan theme and dress code', description: 'Pick a holiday theme and communicate attire expectations to guests.', category: 'Planning', priority: 'medium', daysBeforeEvent: 40 },
      { title: 'Send formal invitations', description: 'Send detailed invitations with date, time, location, and RSVP deadline.', category: 'Planning', priority: 'high', daysBeforeEvent: 30 },
      { title: 'Plan menu & drinks', description: 'Decide on food, signature cocktails, and non-alcoholic options.', category: 'Catering', priority: 'medium', daysBeforeEvent: 21 },
      { title: 'Arrange entertainment & music', description: 'Book a DJ, create a playlist, or plan party games and activities.', category: 'Entertainment', priority: 'medium', daysBeforeEvent: 21 },
      { title: 'Order decorations', description: 'Purchase or rent holiday decorations, centerpieces, and lighting.', category: 'Decorations', priority: 'medium', daysBeforeEvent: 14 },
      { title: 'Confirm final guest count', description: 'Collect RSVPs and finalize headcount for catering and seating.', category: 'Planning', priority: 'high', daysBeforeEvent: 7 },
      { title: 'Set up and decorate venue', description: 'Arrange furniture, hang decorations, and do a final walk-through.', category: 'Logistics', priority: 'high', daysBeforeEvent: 0 },
    ],
  },
  {
    id: 'engagement_party',
    name: 'Engagement Party',
    description: 'Engagement party planning checklist with 9 essential tasks.',
    tasks: [
      { title: 'Set budget and guest list', description: 'Agree on budget with hosts and draft an initial guest list with the couple.', category: 'Planning', priority: 'high', daysBeforeEvent: 60 },
      { title: 'Choose venue', description: 'Select and reserve a venue — home, restaurant, or event space.', category: 'Venue', priority: 'high', daysBeforeEvent: 50 },
      { title: 'Send invitations', description: 'Send invitations with RSVP deadline, including party details.', category: 'Planning', priority: 'high', daysBeforeEvent: 30 },
      { title: 'Plan menu & catering', description: 'Arrange catering, order food, or plan a home-cooked spread.', category: 'Catering', priority: 'medium', daysBeforeEvent: 21 },
      { title: 'Order flowers and decorations', description: 'Purchase floral arrangements and décor that celebrate the couple.', category: 'Decorations', priority: 'medium', daysBeforeEvent: 14 },
      { title: 'Arrange a photo display or slideshow', description: 'Gather photos of the couple and create a visual tribute.', category: 'Entertainment', priority: 'low', daysBeforeEvent: 14 },
      { title: 'Plan toasts and speeches', description: 'Coordinate who will speak and prepare talking points.', category: 'Entertainment', priority: 'medium', daysBeforeEvent: 7 },
      { title: 'Confirm final headcount with vendors', description: 'Finalize RSVPs and share the headcount with caterer and venue.', category: 'Planning', priority: 'high', daysBeforeEvent: 3 },
      { title: 'Set up venue', description: 'Decorate, arrange seating, and prepare the welcome area.', category: 'Logistics', priority: 'high', daysBeforeEvent: 0 },
    ],
  },
  {
    id: 'fundraiser',
    name: 'Fundraiser',
    description: 'Fundraiser planning checklist with 12 essential tasks.',
    tasks: [
      { title: 'Define fundraising goal & budget', description: 'Set a clear monetary goal and outline the event budget.', category: 'Planning', priority: 'high', daysBeforeEvent: 90 },
      { title: 'Assemble planning committee', description: 'Recruit volunteers and assign roles for the event team.', category: 'Planning', priority: 'high', daysBeforeEvent: 80 },
      { title: 'Book venue', description: 'Research and reserve a venue that fits the expected attendance.', category: 'Venue', priority: 'high', daysBeforeEvent: 75 },
      { title: 'Secure sponsors', description: 'Reach out to potential corporate sponsors and confirm commitments.', category: 'Sponsorship', priority: 'high', daysBeforeEvent: 60 },
      { title: 'Plan program and entertainment', description: 'Outline the event agenda, speakers, live auction, or entertainment.', category: 'Entertainment', priority: 'medium', daysBeforeEvent: 60 },
      { title: 'Launch ticket sales & invite campaign', description: 'Open ticket sales and begin promotional outreach via email and social media.', category: 'Marketing', priority: 'high', daysBeforeEvent: 45 },
      { title: 'Book catering', description: 'Select caterer and finalize food and beverage arrangements.', category: 'Catering', priority: 'medium', daysBeforeEvent: 45 },
      { title: 'Prepare auction or donation items', description: 'Collect and catalogue items for auction, raffle, or pledge drives.', category: 'Fundraising', priority: 'high', daysBeforeEvent: 30 },
      { title: 'Send attendee reminder', description: 'Email registered attendees with event details and what to expect.', category: 'Marketing', priority: 'medium', daysBeforeEvent: 14 },
      { title: 'Set up donation & payment processing', description: 'Test online donation tools, card readers, and pledge tracking systems.', category: 'Fundraising', priority: 'high', daysBeforeEvent: 7 },
      { title: 'Confirm final count with vendors', description: 'Share final headcount with caterer and venue for setup planning.', category: 'Planning', priority: 'high', daysBeforeEvent: 3 },
      { title: 'Day-of logistics & volunteer briefing', description: 'Brief volunteers, confirm roles, and do a final venue walkthrough.', category: 'Logistics', priority: 'high', daysBeforeEvent: 0 },
    ],
  },
  {
    id: 'anniversary',
    name: 'Anniversary',
    description: 'Anniversary celebration planning checklist with 9 essential tasks.',
    tasks: [
      { title: 'Set budget and vision', description: 'Decide on the scale of the celebration and establish a budget.', category: 'Planning', priority: 'high', daysBeforeEvent: 60 },
      { title: 'Choose venue', description: 'Select a meaningful or elegant venue for the celebration.', category: 'Venue', priority: 'high', daysBeforeEvent: 45 },
      { title: 'Create guest list & send invitations', description: 'Compile the guest list and send invitations with RSVP details.', category: 'Planning', priority: 'high', daysBeforeEvent: 30 },
      { title: 'Plan catering or book a restaurant', description: 'Arrange catering or reserve a private dining area.', category: 'Catering', priority: 'medium', daysBeforeEvent: 21 },
      { title: 'Order flowers and decorations', description: 'Select floral arrangements and décor that reflect the milestone.', category: 'Decorations', priority: 'medium', daysBeforeEvent: 14 },
      { title: 'Arrange entertainment or slideshow', description: 'Organise live music, a curated playlist, or a photo/video tribute.', category: 'Entertainment', priority: 'medium', daysBeforeEvent: 14 },
      { title: 'Order a commemorative cake', description: 'Design and order a cake that marks the occasion.', category: 'Catering', priority: 'medium', daysBeforeEvent: 10 },
      { title: 'Confirm final guest count', description: 'Collect all RSVPs and share the final headcount with vendors.', category: 'Planning', priority: 'high', daysBeforeEvent: 3 },
      { title: 'Set up venue', description: 'Decorate and arrange the space ahead of guests arriving.', category: 'Logistics', priority: 'high', daysBeforeEvent: 0 },
    ],
  },
  {
    id: 'graduation',
    name: 'Graduation Party',
    description: 'Graduation party planning checklist with 10 essential tasks.',
    tasks: [
      { title: 'Set budget', description: 'Determine total budget for venue, food, decorations, and favors.', category: 'Planning', priority: 'high', daysBeforeEvent: 60 },
      { title: 'Choose venue', description: 'Select a venue — backyard, rented hall, or restaurant private room.', category: 'Venue', priority: 'high', daysBeforeEvent: 45 },
      { title: 'Create guest list & send invitations', description: 'Compile the guest list and send invitations with RSVP details.', category: 'Planning', priority: 'high', daysBeforeEvent: 30 },
      { title: 'Plan food & drinks', description: 'Arrange catering, order food, or plan a self-catered menu.', category: 'Catering', priority: 'medium', daysBeforeEvent: 21 },
      { title: 'Order graduation-themed decorations', description: 'Purchase mortarboard, banner, balloon, and school-colour décor.', category: 'Decorations', priority: 'medium', daysBeforeEvent: 21 },
      { title: 'Order graduation cake', description: 'Design and order a custom graduation cake.', category: 'Catering', priority: 'high', daysBeforeEvent: 14 },
      { title: 'Create memory display or slideshow', description: 'Gather photos from the graduate\'s journey for a tribute display.', category: 'Entertainment', priority: 'medium', daysBeforeEvent: 14 },
      { title: 'Prepare party favors', description: 'Assemble goodie bags or thank-you gifts for guests.', category: 'Decorations', priority: 'low', daysBeforeEvent: 7 },
      { title: 'Confirm final guest count', description: 'Collect all RSVPs and share the final headcount with caterer.', category: 'Planning', priority: 'high', daysBeforeEvent: 3 },
      { title: 'Set up party space', description: 'Decorate the venue, arrange seating, and set up the display.', category: 'Logistics', priority: 'high', daysBeforeEvent: 0 },
    ],
  },
  {
    id: 'retirement',
    name: 'Retirement Party',
    description: 'Retirement party planning checklist with 11 essential tasks.',
    tasks: [
      { title: 'Set budget', description: 'Establish a budget for venue, catering, gifts, and tributes.', category: 'Planning', priority: 'high', daysBeforeEvent: 90 },
      { title: 'Choose venue', description: 'Book a restaurant, event space, or office venue.', category: 'Venue', priority: 'high', daysBeforeEvent: 75 },
      { title: 'Create guest list', description: 'Compile guests — colleagues, family, and friends of the honoree.', category: 'Planning', priority: 'high', daysBeforeEvent: 60 },
      { title: 'Send invitations', description: 'Send invitations with RSVP deadline and event details.', category: 'Planning', priority: 'high', daysBeforeEvent: 45 },
      { title: 'Book catering', description: 'Select caterer and plan a menu appropriate for the occasion.', category: 'Catering', priority: 'medium', daysBeforeEvent: 45 },
      { title: 'Collect memories & tributes', description: 'Ask colleagues and friends to contribute written memories, photos, or video messages.', category: 'Tributes', priority: 'medium', daysBeforeEvent: 30 },
      { title: 'Arrange entertainment or program', description: 'Plan the event program including speeches, awards, and entertainment.', category: 'Entertainment', priority: 'medium', daysBeforeEvent: 30 },
      { title: 'Order cake and decorations', description: 'Order a celebratory cake and purchase décor for the venue.', category: 'Catering', priority: 'medium', daysBeforeEvent: 14 },
      { title: 'Prepare memory book or gift', description: 'Assemble a signed memory book, photo album, or group gift for the honoree.', category: 'Tributes', priority: 'high', daysBeforeEvent: 14 },
      { title: 'Confirm final headcount', description: 'Collect all RSVPs and share the final count with caterer and venue.', category: 'Planning', priority: 'high', daysBeforeEvent: 5 },
      { title: 'Coordinate speeches and presentations', description: 'Brief speakers, prepare the program order, and confirm AV setup.', category: 'Logistics', priority: 'high', daysBeforeEvent: 0 },
    ],
  },
  {
    id: 'baby_shower',
    name: 'Baby Shower',
    description: 'Baby shower planning checklist with 9 essential tasks.',
    tasks: [
      { title: 'Set budget and hosting committee', description: 'Agree on budget and recruit co-hosts to share responsibilities.', category: 'Planning', priority: 'high', daysBeforeEvent: 60 },
      { title: 'Choose venue and theme', description: 'Select a venue and pick a theme — neutral, nursery, garden party, etc.', category: 'Venue', priority: 'high', daysBeforeEvent: 45 },
      { title: 'Send invitations', description: 'Send invitations with RSVP deadline, registry links, and venue details.', category: 'Planning', priority: 'high', daysBeforeEvent: 30 },
      { title: 'Coordinate gift registry', description: 'Share the parents\' registry links with guests.', category: 'Planning', priority: 'medium', daysBeforeEvent: 30 },
      { title: 'Plan menu & refreshments', description: 'Arrange catering or plan a home-prepared spread of food and drinks.', category: 'Catering', priority: 'medium', daysBeforeEvent: 21 },
      { title: 'Order cake and decorations', description: 'Order a themed cake and purchase or make decorations.', category: 'Catering', priority: 'medium', daysBeforeEvent: 14 },
      { title: 'Plan games and activities', description: 'Prepare shower games — baby bingo, predictions, trivia, etc.', category: 'Entertainment', priority: 'medium', daysBeforeEvent: 7 },
      { title: 'Prepare favor bags', description: 'Assemble small take-home gifts or treats for guests.', category: 'Decorations', priority: 'low', daysBeforeEvent: 3 },
      { title: 'Set up shower space', description: 'Decorate, arrange seating, set up a gift table, and prepare welcome area.', category: 'Logistics', priority: 'high', daysBeforeEvent: 0 },
    ],
  },
  {
    id: 'bridal_shower',
    name: 'Bridal Shower',
    description: 'Bridal shower planning checklist with 11 essential tasks.',
    tasks: [
      { title: 'Set budget', description: 'Establish a budget shared among hosts for all shower expenses.', category: 'Planning', priority: 'high', daysBeforeEvent: 90 },
      { title: 'Choose venue and theme', description: 'Select a venue and theme — garden tea party, spa day, brunch, etc.', category: 'Venue', priority: 'high', daysBeforeEvent: 75 },
      { title: 'Create guest list with the bride', description: 'Collaborate with the bride to finalise the invite list.', category: 'Planning', priority: 'high', daysBeforeEvent: 60 },
      { title: 'Send invitations', description: 'Send invitations with RSVP deadline, registry info, and venue details.', category: 'Planning', priority: 'high', daysBeforeEvent: 45 },
      { title: 'Confirm bride\'s preferences', description: 'Check in with the bride on food, activities, and any special requests.', category: 'Planning', priority: 'medium', daysBeforeEvent: 30 },
      { title: 'Plan menu & catering', description: 'Arrange catering or plan a home-prepared spread aligned with the theme.', category: 'Catering', priority: 'medium', daysBeforeEvent: 30 },
      { title: 'Order flowers and decorations', description: 'Purchase floral arrangements and themed décor.', category: 'Decorations', priority: 'medium', daysBeforeEvent: 21 },
      { title: 'Plan games and activities', description: 'Prepare bridal games — "How well do you know the couple?", trivia, advice cards, etc.', category: 'Entertainment', priority: 'medium', daysBeforeEvent: 14 },
      { title: 'Assemble favor bags', description: 'Put together small keepsake gifts for guests.', category: 'Decorations', priority: 'low', daysBeforeEvent: 7 },
      { title: 'Confirm final guest count', description: 'Collect all RSVPs and share the final headcount with caterer and venue.', category: 'Planning', priority: 'high', daysBeforeEvent: 3 },
      { title: 'Set up venue', description: 'Decorate, arrange seating and gift table, and prepare a welcome display.', category: 'Logistics', priority: 'high', daysBeforeEvent: 0 },
    ],
  },
  {
    id: 'themed',
    name: 'Themed Event',
    description: 'Themed event planning checklist with 10 essential tasks.',
    tasks: [
      { title: 'Define theme and budget', description: 'Lock in the theme concept and establish an overall budget.', category: 'Planning', priority: 'high', daysBeforeEvent: 90 },
      { title: 'Book venue', description: 'Find and reserve a venue suited to bringing the theme to life.', category: 'Venue', priority: 'high', daysBeforeEvent: 75 },
      { title: 'Design invitations aligned with theme', description: 'Create on-theme invitation designs and communicate dress code.', category: 'Planning', priority: 'medium', daysBeforeEvent: 60 },
      { title: 'Send invitations', description: 'Distribute invitations and open RSVPs.', category: 'Planning', priority: 'high', daysBeforeEvent: 45 },
      { title: 'Source themed decorations and props', description: 'Purchase or rent props, backdrops, and décor that match the theme.', category: 'Decorations', priority: 'high', daysBeforeEvent: 45 },
      { title: 'Plan dress code guidance for guests', description: 'Share clear costume or attire guidance to help guests participate.', category: 'Planning', priority: 'medium', daysBeforeEvent: 30 },
      { title: 'Book themed catering or menu', description: 'Plan food and drinks that complement the theme.', category: 'Catering', priority: 'medium', daysBeforeEvent: 30 },
      { title: 'Book entertainment aligned with theme', description: 'Hire performers, musicians, or plan activities that fit the concept.', category: 'Entertainment', priority: 'medium', daysBeforeEvent: 30 },
      { title: 'Confirm final guest count', description: 'Collect all RSVPs and finalize headcount with vendors.', category: 'Planning', priority: 'high', daysBeforeEvent: 7 },
      { title: 'Set up themed installations and venue', description: 'Install props, lighting, and décor to fully realise the theme before guests arrive.', category: 'Logistics', priority: 'high', daysBeforeEvent: 0 },
    ],
  },
  {
    id: 'celebration_of_life',
    name: 'Celebration of Life',
    description: 'Celebration of life planning checklist with 8 essential tasks.',
    tasks: [
      { title: 'Identify planning team and assign roles', description: 'Recruit family members or close friends to share planning responsibilities.', category: 'Planning', priority: 'high', daysBeforeEvent: 30 },
      { title: 'Choose venue', description: 'Select a meaningful venue — a favourite place, community hall, or family home.', category: 'Venue', priority: 'high', daysBeforeEvent: 25 },
      { title: 'Notify guests and share details', description: 'Reach out to family, friends, and community with event details and RSVP info.', category: 'Planning', priority: 'high', daysBeforeEvent: 21 },
      { title: 'Collect photos, memories, and tributes', description: 'Ask attendees to submit photos, written memories, or short video tributes.', category: 'Tributes', priority: 'high', daysBeforeEvent: 21 },
      { title: 'Plan program and order of service', description: 'Outline the event flow — welcome, tributes, readings, music, and open sharing.', category: 'Planning', priority: 'high', daysBeforeEvent: 14 },
      { title: 'Arrange catering or refreshments', description: 'Plan light catering or refreshments to create a warm, welcoming atmosphere.', category: 'Catering', priority: 'medium', daysBeforeEvent: 14 },
      { title: 'Create memory display and tribute materials', description: 'Assemble a photo board, memory book, or slideshow for the service.', category: 'Tributes', priority: 'high', daysBeforeEvent: 7 },
      { title: 'Day-of coordination', description: 'Greet guests, manage the program flow, and coordinate speakers and readings.', category: 'Logistics', priority: 'high', daysBeforeEvent: 0 },
    ],
  },
];

/**
 * Returns template metadata (without full task details) for the frontend picker.
 */
export function getTemplateList() {
  return TASK_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    taskCount: t.tasks.length,
    categories: [...new Set(t.tasks.map((task) => task.category))],
  }));
}

/**
 * Finds a template by ID and computes due dates from the event date.
 * Due dates are calculated as eventDate - daysBeforeEvent.
 */
export function resolveTemplate(templateId: string, eventDate: Date) {
  const template = TASK_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;

  return template.tasks.map((task, index) => {
    const dueDate = new Date(eventDate);
    dueDate.setDate(dueDate.getDate() - task.daysBeforeEvent);

    return {
      title: task.title,
      description: task.description,
      category: task.category,
      priority: task.priority,
      dueDate,
      sortOrder: index,
    };
  });
}

/**
 * Finds a template by ID and computes due dates forward from a planning start date.
 * The earliest task (highest daysBeforeEvent) is due on the start date,
 * and subsequent tasks are spread forward preserving their relative spacing.
 * No task due date will exceed the event date.
 */
export function resolveTemplateFromStartDate(templateId: string, startDate: Date, eventDate: Date) {
  const template = TASK_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;

  const maxDays = Math.max(...template.tasks.map((t) => t.daysBeforeEvent));

  return template.tasks.map((task, index) => {
    const dueDate = new Date(startDate);
    dueDate.setDate(dueDate.getDate() + (maxDays - task.daysBeforeEvent));

    if (dueDate > eventDate) {
      dueDate.setTime(eventDate.getTime());
    }

    return {
      title: task.title,
      description: task.description,
      category: task.category,
      priority: task.priority,
      dueDate,
      sortOrder: index,
    };
  });
}
