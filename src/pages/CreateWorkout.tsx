import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import WorkoutEditor from '../components/WorkoutEditor';

const CreateWorkout: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studentIdFromUrl = searchParams.get('studentId');

  return (
    <div className="pb-20">
      <WorkoutEditor 
        initialStudentId={studentIdFromUrl || ''} 
        onSaved={() => navigate('/personal')} 
        onCancel={() => navigate(-1)} 
      />
    </div>
  );
};

export default CreateWorkout;
