import { GameState, Project } from '../types';

type ProjectEffects = Pick<Project, 'onComplete' | 'onFail'>;

/**
 * Project callbacks are functions and therefore cannot survive localStorage
 * serialization. Keep the built-in effects in a stable registry and hydrate
 * them by project ID when a save is loaded.
 */
export const PROJECT_EFFECTS: Record<string, ProjectEffects> = {
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
