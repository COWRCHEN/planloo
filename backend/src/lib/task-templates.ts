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
