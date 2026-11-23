import assert from 'node:assert/strict';
import test from 'node:test';
import { addWallSpeakers, mapSessionizeProgram, parseSpeakerWall, RIVERSIDE_URL, sessionDelivery, sessionFormat, sessionsFromGrid, sessionsFromView, splitTagLine } from './sessionize';

test('separa cargo y empresa del tagline de Sessionize', () => {
  assert.deepEqual(splitTagLine('CTO & Founder at Alcale Solutions'), {
    role: 'CTO & Founder',
    company: 'Alcale Solutions',
  });
  assert.deepEqual(splitTagLine('TiderOps - Principal Software Engineer'), {
    role: 'Principal Software Engineer',
    company: 'TiderOps',
  });
  assert.deepEqual(splitTagLine('Arquitecto de Software'), {
    role: 'Arquitecto de Software',
    company: null,
  });
});

test('distingue online, presencial y las dos modalidades', () => {
  const categories = (names: string[]) => [{ name: 'Option', categoryItems: names.map((name) => ({ name })) }];
  assert.equal(sessionDelivery(categories(['Virtual'])), 'online');
  assert.equal(sessionDelivery(categories(['Presencial'])), 'presencial');
  assert.equal(sessionDelivery(categories(['Virtual', 'Presencial'])), 'ambas');
  const program = mapSessionizeProgram([], [
    {
      id: 1,
      title: 'Charla online',
      startsAt: '2026-11-28T11:00:00',
      endsAt: '2026-11-28T11:55:00',
      categories: categories(['Virtual']),
      speakers: [],
    },
  ]);
  assert.equal(program.sessions[0]?.liveUrl, RIVERSIDE_URL);
});

test('el taller y la charla salen del tipo de Sessionize', () => {
  assert.equal(sessionFormat({ categories: [{ name: 'Type', categoryItems: [{ name: 'Workshop' }] }] }), 'taller');
  assert.equal(sessionFormat({ categories: [{ name: 'Type', categoryItems: [{ name: 'Talk' }] }] }), 'charla');
  assert.equal(sessionFormat({ isServiceSession: true }), 'pausa');
});

test('arma conferencistas y sesiones publicadas en hora de Lima', () => {
  const program = mapSessionizeProgram(
    [
      {
        id: 'sp-1',
        fullName: 'Ana Quispe',
        tagLine: 'Backend Engineer at Entelgy',
        bio: 'Habla de Java.',
        profilePicture: 'https://cdn.sessionize.com/ana.png',
        links: [{ linkType: 'LinkedIn', url: 'https://www.linkedin.com/in/ana' }],
      },
    ],
    sessionsFromView([
      {
        sessions: [
          {
            id: 10,
            title: 'Virtual Threads',
            description: 'Una charla.',
            startsAt: '2026-11-28T09:00:00',
            endsAt: '2026-11-28T09:55:00',
            room: 'SUM (Auditorio)',
            status: 'Accepted',
            categories: [
              { name: 'Type', categoryItems: [{ name: 'Talk' }] },
              { name: 'Track', categoryItems: [{ name: 'Core Java' }, { name: 'Cloud Native for Java' }] },
            ],
            speakers: [{ id: 'sp-1', name: 'Ana Quispe' }],
          },
        ],
      },
    ]),
  );
  assert.equal(program.speakers.length, 1);
  assert.equal(program.speakers[0]?.company, 'Entelgy');
  assert.equal(program.speakers[0]?.linkedin, 'https://www.linkedin.com/in/ana');
  assert.equal(program.sessions.length, 1);
  assert.equal(program.sessions[0]?.format, 'charla');
  assert.equal(program.sessions[0]?.track, 'Core Java, Cloud Native for Java');
  assert.equal(program.sessions[0]?.status, 'publicada');
  assert.deepEqual(program.sessions[0]?.speakerIds, ['sp-1']);
  assert.equal(program.sessions[0]?.startsAt.toISOString(), '2026-11-28T14:00:00.000Z');
});

test('la grilla trae las pausas y el muro agrega al conferencista que falta', () => {
  const sessions = sessionsFromGrid([
    {
      rooms: [
        {
          name: 'DIRECTORIO 1',
          sessions: [
            {
              id: 'pausa-1',
              title: 'Bienvenida y recojo de credenciales',
              startsAt: '2026-11-28T08:00:00',
              endsAt: '2026-11-28T09:00:00',
              isServiceSession: true,
              speakers: [],
            },
          ],
        },
      ],
    },
  ]);
  const program = addWallSpeakers(mapSessionizeProgram([], sessions), parseSpeakerWall(`
    <li id="sz-speaker-abc" data-speakerid="abc" class="sz-speaker sz-speaker--full">
      <img src="https://cdn.sessionize.com/andre.jpg" alt="Andre Alzamora Deza">
      <h3 class="sz-speaker__name">Andre Alzamora Deza</h3>
      <h4 class="sz-speaker__tagline">Technical Lead</h4>
      <a href="https://www.linkedin.com/in/andre">LinkedIn</a>
      <p class="sz-speaker__bio">Software Engineer</p>
      <dt> Company </dt><dd> Scotiabank </dd>
    </li>
  `));
  assert.equal(program.sessions[0]?.format, 'pausa');
  assert.equal(program.sessions[0]?.room, 'DIRECTORIO 1');
  assert.equal(program.speakers.length, 1);
  assert.equal(program.speakers[0]?.name, 'Andre Alzamora Deza');
  assert.equal(program.speakers[0]?.company, 'Scotiabank');
  assert.equal(program.speakers[0]?.linkedin, 'https://www.linkedin.com/in/andre');
});
