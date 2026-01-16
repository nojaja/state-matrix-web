import { OpfsRepository } from './OpfsRepository';
import type { 
  CategoryMaster, 
  ActionTriggerType, 
  ArtifactType, 
  CausalRelationType, 
  ProcessType 
} from '../types/models';

export const CategoryRepository = new OpfsRepository<CategoryMaster>('CategoryMaster');
export const ActionTriggerRepository = new OpfsRepository<ActionTriggerType>('ActionTriggerTypes');
export const ArtifactRepository = new OpfsRepository<ArtifactType>('ArtifactTypes');
export const CausalRelationRepository = new OpfsRepository<CausalRelationType>('CausalRelationsTypes');
export const ProcessRepository = new OpfsRepository<ProcessType>('ProcessTypes');
