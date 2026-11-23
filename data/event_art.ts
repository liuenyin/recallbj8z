import { Phase, type GameEvent } from '../types';

const eventArt: readonly (readonly [URL, readonly string[]])[] = [
    [new URL('../assets/event-art/admission-envelope.webp', import.meta.url), ['sum_goal_selection']],
    [new URL('../assets/event-art/summer-street.webp', import.meta.url), ['sum_city_walk']],
    [new URL('../assets/event-art/lunch-card.webp', import.meta.url), ['campus_lost_card', 's2_daily_lost_card', 'flavor_6']],
    [new URL('../assets/event-art/new-years-window.webp', import.meta.url), ['wb_new_year']],
    [new URL('../assets/event-art/autumn-park-path.webp', import.meta.url), ['evt_autumn_trip']],
    [new URL('../assets/event-art/pendulums.webp', import.meta.url), ['s2_daily_pendulums']],
    [new URL('../assets/event-art/rainy-running-track.webp', import.meta.url), ['s2_daily_wet_track']],
    [new URL('../assets/event-art/duplicate-worksheets.webp', import.meta.url), ['s2_daily_duplicate_page']],
    [new URL('../assets/event-art/library-still-life.webp', import.meta.url), ['s2_daily_book_corner', 's1_library', 'sum_library_encounter']],
    [new URL('../assets/event-art/festival-projector.webp', import.meta.url), ['evt_sci_fest']],
    [new URL('../assets/event-art/drama-stage.webp', import.meta.url), ['s2_drama_performance']],
    [new URL('../assets/event-art/spring-outing.webp', import.meta.url), ['s2_spring_trip', 's2_spring_trip_lost']],
    [new URL('../assets/event-art/winter-snow.webp', import.meta.url), ['flavor_2']],
    [new URL('../assets/event-art/military-bedding.webp', import.meta.url), ['mil_blanket', 'mil_night_talk']],
    [new URL('../assets/event-art/computer-lab.webp', import.meta.url), [
        'sum_oi_basics', 'evt_oi_gaming', 'oi_after_school', 'oi_bug_hell', 'oi_mock_win',
        'oi_team_practice', 'oi_apio_exam', 'oi_problem_testing'
    ]],
    [new URL('../assets/event-art/math-training.webp', import.meta.url), [
        'mo_summer_diagnostic', 'mo_league_paper_two', 'mo_mock_paper_two'
    ]],
    [new URL('../assets/event-art/late-homework.webp', import.meta.url), ['flavor_1', 's2_late_night_homework']],
    [new URL('../assets/event-art/basketball-court.webp', import.meta.url), [
        's2_basketball_start', 's2_basketball_training', 's2_basketball_match', 's2_basketball_final'
    ]],
    [new URL('../assets/event-art/blackboard-bulletin.webp', import.meta.url), ['s1_class_board', 's1_class_board_finish', 's1_class_board_reunion']],
    [new URL('../assets/event-art/canteen-tray.webp', import.meta.url), ['evt_canteen_rush']],
    [new URL('../assets/event-art/classroom-exam.webp', import.meta.url), ['s2_academic_exam', 'mo_league_paper_one', 'mo_mock_paper_one']],
    [new URL('../assets/event-art/lecture-microphone.webp', import.meta.url), [
        's2_debate_match', 's2_debate_quarter', 's2_debate_semi', 's2_debate_final'
    ]],
    [new URL('../assets/event-art/classroom-morning.webp', import.meta.url), ['sci_fest_first_day', 's2_seat_change', 's2_drama_audition']]
];

const illustrations = new Map(eventArt.flatMap(([url, events]) => events.map(id => [id, url.href] as const)));
const chemistryLab = new URL('../assets/event-art/lab-bench.webp', import.meta.url).href;
const biologyLab = new URL('../assets/event-art/microscope-slide.webp', import.meta.url).href;

export function getEventIllustration(event: Pick<GameEvent, 'id' | 'serialized'>, phase: Phase): string | undefined {
    if (event.serialized?.source === 'ai') return undefined;
    if (event.id === 'study_weekly_chemistry' && (phase === Phase.SEMESTER_1 || phase === Phase.SEMESTER_2)) return chemistryLab;
    if (event.id === 'study_weekly_biology' && phase === Phase.SEMESTER_1) return biologyLab;
    return illustrations.get(event.id);
}
