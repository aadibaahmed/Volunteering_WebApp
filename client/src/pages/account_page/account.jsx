import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Select from 'react-select';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { api } from '../../lib/api';
import './account.css';
import { useNavigate } from 'react-router-dom';
import Header from '../../assets/header_after/header_after';


const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const SKILLS = ["First Aid","CPR","Teaching","Event Setup","Food Service","Crowd Control","Logistics"].map(s => ({ label:s, value:s }));

const pad = (n)=>String(n).padStart(2,'0');
const toISO = (d)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const fmt = (d)=> new Date(d).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'2-digit'});

const Schema = z.object({
  first_name: z.string().min(1).max(50),
  last_name:  z.string().min(1).max(50),
  address1:   z.string().min(1).max(100),
  address2:   z.string().max(100).optional(),
  city:       z.string().min(1).max(100),
  state_code: z.string().length(2),
  zip_code:   z.string().min(5).max(9),
  preferences:z.string().optional(),
  skills:     z.array(z.string()).min(1),
  availability: z.array(z.string()).min(1)
});

export default function Account() {
  const navigate = useNavigate();
  const [dates, setDates] = useState([]);

  const { register, handleSubmit, setValue, getValues, reset, formState:{errors} } =
    useForm({
      resolver: zodResolver(Schema),
      defaultValues: {
        first_name:'', last_name:'', address1:'', address2:'', city:'',
        state_code:'', zip_code:'', preferences:'', skills:[], availability:[]
      }
    });

  // Load user profile
  useEffect(() => {
  (async () => {
    try {
      const { data: me } = await api.get('/profile/me'); 
      if (me) {
        reset({
          first_name: me.first_name || '',
          last_name:  me.last_name || '',
          address1:   me.address1 || '',
          address2:   me.address2 || '',
          city:       me.city || '',
          state_code: me.state_code || '',
          zip_code:   me.zip_code || '',
          preferences: me.preferences || '',
          skills:     me.skills || [],
          availability: (me.availability || []).map(d => d)
        });
        setDates((me.availability || []).map(d => new Date(d)));
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  })();
}, [reset]);

// Keep availability synced
useEffect(() => {
  const iso = [...new Set(dates.map(toISO))];
  setValue('availability', iso, { shouldValidate: true });
}, [dates, setValue]);

const onSubmit = async (data) => {
  try {
    await api.post('/profile', {   
      first_name: data.first_name,
      last_name: data.last_name,
      address1: data.address1,
      address2: data.address2 || null,
      city: data.city,
      state_code: data.state_code,
      zip_code: data.zip_code,
      preferences: data.preferences || null
    });

    await api.put('/profile/skills', getValues('skills'));
    await api.put('/profile/availability', getValues('availability'));
    await api.post('/profile/complete'); 

    const u = JSON.parse(localStorage.getItem('user') || '{}');
    localStorage.setItem('user', JSON.stringify({ ...u, completed: true }));
    alert('Profile saved!');
    navigate('/volunteerdash');
  } catch (err) {
    console.error('Error saving profile:', err);
    alert('Failed to save profile: ' + (err.response?.data?.error || err.message));
  }
};
  return (
    <div className="account-form">
      <Header />
      <h1>Complete Your Profile</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="section-header">General Information</div>
        
        <div className="form-grid">
          <Field label="First Name*" error={errors.first_name?.message}>
            <input {...register('first_name')} maxLength={50}/>
          </Field>

          <Field label="Last Name*" error={errors.last_name?.message}>
            <input {...register('last_name')} maxLength={50}/>
          </Field>

          <Field label="Address 1*" error={errors.address1?.message}>
            <input {...register('address1')} maxLength={100}/>
          </Field>

          <Field label="Address 2 (optional)" error={errors.address2?.message}>
            <input {...register('address2')} maxLength={100}/>
          </Field>

          <Field label="City*" error={errors.city?.message}>
            <input {...register('city')} maxLength={100}/>
          </Field>

          <Field label="State*" error={errors.state_code?.message}>
            <select {...register('state_code')} defaultValue="">
              <option value="" disabled>Choose</option>
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          <Field label="Zip Code (5–9)*" error={errors.zip_code?.message}>
            <input {...register('zip_code')} maxLength={9} placeholder="12345 or 12345-6789"/>
          </Field>

          <Field label="Skills* (select multiple)" error={errors.skills?.message}>
            <Select
              isMulti
              classNamePrefix="rs"
              options={SKILLS}
              value={SKILLS.filter(o => (getValues('skills')||[]).includes(o.value))}
              onChange={(vals)=> setValue('skills', vals.map(v=>v.value), { shouldValidate:true })}
            />
          </Field>

          <div className="form-full">
            <Field label="Preferences (optional)" error={errors.preferences?.message}>
              <textarea rows={3} {...register('preferences')} placeholder="Tell us about your volunteer preferences..."/>
            </Field>
          </div>
        </div>

        <div className="calendar-section">
          <div className="section-header">Availability</div>
          <div className="calendar-section-title">Select your available dates* (multiple dates allowed)</div>
          
          <div className="calendar-wrapper">
            <div className="calendar-col">
              <DayPicker mode="multiple" selected={dates} onSelect={setDates}/>
            </div>
            
            <div className="selected-col">
              <div className="selected-header">
                Selected ({(getValues('availability')||[]).length})
                {!!dates.length && (
                  <button type="button" className="clear-btn" onClick={() => setDates([])}>Clear</button>
                )}
              </div>
              <ul className="selected-list">
                {(getValues('availability') || []).map((iso) => (
                  <li key={iso} className="badge">{fmt(iso)}</li>
                ))}
                {!(getValues('availability')||[]).length && <li className="muted">No dates selected yet</li>}
              </ul>
              {errors.availability && <div className="error">{errors.availability.message}</div>}
            </div>
          </div>
        </div>

        <button type="submit">Save Profile</button>
      </form>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {error && <div className="error">{error}</div>}
    </div>
  );
}