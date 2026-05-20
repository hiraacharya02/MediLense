export const approvedContent = [
  {
    id: "cardiac-cycle",
    title: "Cardiac Cycle",
    keywords: ["cardiac cycle", "heart cycle", "systole", "diastole", "heart"],
    images: [
      { url: "/images/cardiac1.jpeg", alt: "Heart during Systole contraction phase" },
      { url: "/images/cardiac2.jpeg", alt: "Heart during Diastole relaxation phase" }
    ],
    approvedText: `
The cardiac cycle is the sequence of events that happens during one heartbeat.
It includes diastole, when the heart muscle relaxes and the chambers fill with blood, and systole, when the heart muscle contracts and pumps blood.
The atria contract before the ventricles, helping move blood into the ventricles.
The ventricles then contract to send blood to the lungs and the rest of the body.
Heart valves help maintain one-way blood flow by opening and closing according to pressure changes.
This topic is useful for understanding heart sounds, blood pressure, and basic cardiovascular physiology.
    `,
    sources: [
      {
        title: "Cardiac cycle study notes",
        provider: "MediLense approved local library",
        type: "teacher/project-approved notes",
        url: "",
        trustReason: "This short prototype text was manually approved by the project team for demo use."
      },
      {
        title: "MedlinePlus: Heart and circulation videos",
        provider: "U.S. National Library of Medicine",
        type: "health education video library",
        url: "https://medlineplus.gov/medlineplus-videos/",
        trustReason: "Used as an example of a trusted public health education source."
      }
    ],
    videos: [
      {
        title: "Heart and Circulation Videos",
        channel: "MedlinePlus",
        url: "https://medlineplus.gov/medlineplus-videos/",
        description: "Trusted public health videos related to the heart and circulation."
      },
      {
        title: "Cardiac Cycle Overview",
        channel: "Khan Academy Medicine",
        url: "https://www.khanacademy.org/science/health-and-medicine",
        description: "Useful supplementary educational video source for medical concepts."
      }
    ]
  },
  {
    id: "diabetes-basics",
    title: "Diabetes Basics",
    keywords: ["diabetes", "insulin", "glucose", "blood sugar", "type 1", "type 2"],
    approvedText: `
Diabetes is a condition where the body has difficulty regulating blood glucose.
Insulin is a hormone that helps glucose move from the blood into cells.
In type 1 diabetes, the body does not produce enough insulin.
In type 2 diabetes, the body does not use insulin effectively, which is called insulin resistance.
Persistently high blood glucose can damage blood vessels, nerves, eyes, kidneys, and the heart over time.
For students, the key idea is to connect insulin function, glucose regulation, and long-term complications.
    `,
    sources: [
      {
        title: "Diabetes basics study notes",
        provider: "MediLense approved local library",
        type: "teacher/project-approved notes",
        url: "",
        trustReason: "This text was manually curated for the school prototype."
      },
      {
        title: "MedlinePlus: Diabetes",
        provider: "U.S. National Library of Medicine",
        type: "medical education article",
        url: "https://medlineplus.gov/diabetes.html",
        trustReason: "Used as an example of a trusted public medical information source."
      }
    ],
    videos: [
      {
        title: "Diabetes learning resources",
        channel: "MedlinePlus",
        url: "https://medlineplus.gov/diabetes.html",
        description: "Trusted diabetes overview and links for further learning."
      }
    ]
  },
  {
    id: "respiratory-system",
    title: "Respiratory System",
    keywords: ["respiratory", "lungs", "breathing", "gas exchange", "alveoli", "oxygen", "carbon dioxide"],
    approvedText: `
The respiratory system moves oxygen into the body and removes carbon dioxide.
Air travels through the nose or mouth, down the trachea, into the bronchi, and then into smaller airways that end near alveoli.
Alveoli are small air sacs where gas exchange occurs.
Oxygen moves from the alveoli into the blood, while carbon dioxide moves from the blood into the alveoli to be exhaled.
The diaphragm is a major muscle involved in breathing.
This topic is important for understanding oxygen delivery, ventilation, and common respiratory diseases.
    `,
    sources: [
      {
        title: "Respiratory system study notes",
        provider: "MediLense approved local library",
        type: "teacher/project-approved notes",
        url: "",
        trustReason: "This text was manually curated for the prototype."
      },
      {
        title: "MedlinePlus: Lungs and breathing",
        provider: "U.S. National Library of Medicine",
        type: "medical education article",
        url: "https://medlineplus.gov/lungsandbreathing.html",
        trustReason: "Used as an example of a trusted public medical information source."
      }
    ],
    videos: [
      {
        title: "Lungs and Breathing",
        channel: "MedlinePlus",
        url: "https://medlineplus.gov/lungsandbreathing.html",
        description: "Trusted overview resource for respiratory topics."
      }
    ]
  }
];

export function findApprovedTopic(userTopic) {
  const input = String(userTopic || "").toLowerCase().trim();

  if (!input) return null;

  return approvedContent.find(topic =>
    topic.keywords.some(keyword =>
      input.includes(keyword.toLowerCase()) ||
      keyword.toLowerCase().includes(input)
    )
  ) || null;
}
