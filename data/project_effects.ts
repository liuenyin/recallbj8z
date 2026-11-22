import { GameState, Project } from '../types';

type ProjectEffects = Pick<Project, 'onComplete' | 'onFail'>;

export const PROJECT_WORK_PROGRESS = 25;
export const CAMPUS_PROJECT_ID = 'proj_campus_observation';
export const getProjectSessionsLeft = (project: Project) =>
    Math.max(0, Math.ceil((project.requiredProgress - project.progress) / PROJECT_WORK_PROGRESS));

/**
 * Project callbacks cannot be serialized directly to localStorage.
 * Rehydrate registered built-in research projects by ID on save load.
 */
export const PROJECT_EFFECTS: Record<string, ProjectEffects> = {
    [CAMPUS_PROJECT_ID]: {
        onComplete: state => ({
            general: { ...state.general, experience: state.general.experience + 6, efficiency: state.general.efficiency + 2 }
        })
    },
    proj_online_class: {
        onComplete: (state: GameState) => ({
            general: { ...state.general, efficiency: state.general.efficiency + 5, mindset: state.general.mindset + 10 }
        }),
        onFail: (state: GameState) => ({
            general: { ...state.general, efficiency: state.general.efficiency - 10, mindset: state.general.mindset - 15 }
        })
    }
};

export const hydrateProject = (project: Project): Project => ({
    ...project,
    ...(project.effectKey && PROJECT_EFFECTS[project.effectKey]
        ? PROJECT_EFFECTS[project.effectKey]
        : PROJECT_EFFECTS[project.id] || {})
});
