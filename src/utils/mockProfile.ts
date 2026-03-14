import type { PracticeSession } from '../types'

function isoDaysAgo(daysAgo: number, hour: number, minute: number): string {
  const value = new Date()
  value.setDate(value.getDate() - daysAgo)
  value.setHours(hour, minute, 0, 0)
  return value.toISOString()
}

export function createFakeProfileSessions(): PracticeSession[] {
  const now = new Date().toISOString()

  const sessions: PracticeSession[] = [
    {
      id: 'mock-001',
      startTime: isoDaysAgo(0, 7, 15),
      totalDurationMinutes: 42,
      notes: 'Morning warm-up with clean articulation focus.',
      entries: [
        {
          id: 'mock-001-a',
          piece: 'Scales',
          focusArea: 'Evenness',
          durationMinutes: 12,
        },
        {
          id: 'mock-001-b',
          piece: 'Moonlight Sonata 3rd Mvt',
          focusArea: 'Tempo control',
          durationMinutes: 30,
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'mock-002',
      startTime: isoDaysAgo(1, 21, 5),
      totalDurationMinutes: 55,
      notes: 'Focused repeat work on transitions.',
      entries: [
        {
          id: 'mock-002-a',
          piece: 'Chopin Winter Wind',
          focusArea: 'Section B voicing',
          durationMinutes: 35,
        },
        {
          id: 'mock-002-b',
          piece: 'Scales',
          focusArea: 'Relaxed wrists',
          durationMinutes: 20,
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'mock-003',
      startTime: isoDaysAgo(3, 18, 30),
      totalDurationMinutes: 35,
      notes: '',
      entries: [
        {
          id: 'mock-003-a',
          piece: 'Brahms Intermezzo Op 118 No 2',
          focusArea: 'Tone shaping',
          durationMinutes: 20,
        },
        {
          id: 'mock-003-b',
          piece: 'Moonlight Sonata 3rd Mvt',
          focusArea: 'Slow practice',
          durationMinutes: 15,
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'mock-004',
      startTime: isoDaysAgo(6, 6, 50),
      totalDurationMinutes: 28,
      notes: 'Light day.',
      entries: [
        {
          id: 'mock-004-a',
          piece: 'Scales',
          focusArea: 'Hands together',
          durationMinutes: 28,
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'mock-005',
      startTime: isoDaysAgo(8, 20, 45),
      totalDurationMinutes: 64,
      notes: 'Recorded run-through at the end.',
      entries: [
        {
          id: 'mock-005-a',
          piece: 'Chopin Winter Wind',
          focusArea: 'Memorization',
          durationMinutes: 24,
        },
        {
          id: 'mock-005-b',
          piece: 'Moonlight Sonata 3rd Mvt',
          focusArea: 'Consistency',
          durationMinutes: 40,
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'mock-006',
      startTime: isoDaysAgo(11, 7, 40),
      totalDurationMinutes: 46,
      notes: '',
      entries: [
        {
          id: 'mock-006-a',
          piece: 'Brahms Intermezzo Op 118 No 2',
          focusArea: 'Pedaling clarity',
          durationMinutes: 26,
        },
        {
          id: 'mock-006-b',
          piece: 'Scales',
          focusArea: 'Slow practice',
          durationMinutes: 20,
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'mock-007',
      startTime: isoDaysAgo(15, 19, 20),
      totalDurationMinutes: 70,
      notes: 'Long session before weekend.',
      entries: [
        {
          id: 'mock-007-a',
          piece: 'Moonlight Sonata 3rd Mvt',
          focusArea: 'Endurance',
          durationMinutes: 45,
        },
        {
          id: 'mock-007-b',
          piece: 'Scales',
          focusArea: 'Accuracy',
          durationMinutes: 25,
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'mock-008',
      startTime: isoDaysAgo(22, 18, 15),
      totalDurationMinutes: 38,
      notes: '',
      entries: [
        {
          id: 'mock-008-a',
          piece: 'Chopin Winter Wind',
          focusArea: 'Left hand control',
          durationMinutes: 18,
        },
        {
          id: 'mock-008-b',
          piece: 'Brahms Intermezzo Op 118 No 2',
          focusArea: 'Phrase breathing',
          durationMinutes: 20,
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'mock-009',
      startTime: isoDaysAgo(31, 6, 25),
      totalDurationMinutes: 33,
      notes: 'Quick practice before work.',
      entries: [
        {
          id: 'mock-009-a',
          piece: 'Scales',
          focusArea: 'Rhythmic variation',
          durationMinutes: 14,
        },
        {
          id: 'mock-009-b',
          piece: 'Moonlight Sonata 3rd Mvt',
          focusArea: 'Hands sync',
          durationMinutes: 19,
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'mock-010',
      startTime: isoDaysAgo(44, 20, 10),
      totalDurationMinutes: 50,
      notes: '',
      entries: [
        {
          id: 'mock-010-a',
          piece: 'Brahms Intermezzo Op 118 No 2',
          focusArea: 'Voicing',
          durationMinutes: 28,
        },
        {
          id: 'mock-010-b',
          piece: 'Scales',
          focusArea: 'Relaxation',
          durationMinutes: 22,
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
  ]

  return sessions.sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
  )
}
