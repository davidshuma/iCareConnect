import { Component, Input, OnInit } from "@angular/core";
import { MatRadioChange } from "@angular/material/radio";
import { Store } from "@ngrx/store";
import { Observable, zip } from "rxjs";
import { map, take, tap, withLatestFrom } from "rxjs/operators";
import { SystemSettingsService } from "src/app/core/services/system-settings.service";
import { LabSampleModel } from "src/app/modules/laboratory/resources/models";
import { LISConfigurationsModel } from "src/app/modules/laboratory/resources/models/lis-configurations.model";
import { DateField } from "src/app/shared/modules/form/models/date-field.model";
import { Dropdown } from "src/app/shared/modules/form/models/dropdown.model";
import { PhoneNumber } from "src/app/shared/modules/form/models/phone-number.model";
import { TextArea } from "src/app/shared/modules/form/models/text-area.model";
import { Textbox } from "src/app/shared/modules/form/models/text-box.model";
import { ConceptGetFull } from "src/app/shared/resources/openmrs";
import { SamplesService } from "src/app/shared/services/samples.service";
import {
  loadConceptByUuid,
  loadLocationsByTagName,
  loadLocationsByTagNames,
} from "src/app/store/actions";
import { AppState } from "src/app/store/reducers";
import { getConceptById } from "src/app/store/selectors";
import { getCurrentUserDetails } from "src/app/store/selectors/current-user.selectors";

@Component({
  selector: "app-register-sample",
  templateUrl: "./register-sample.component.html",
  styleUrls: ["./register-sample.component.scss"],
})
export class RegisterSampleComponent implements OnInit {
  @Input() provider: any;
  @Input() LISConfigurations: LISConfigurationsModel;
  @Input() labSections: ConceptGetFull[];
  registrationCategory: string = "single";
  currentUser$: Observable<any>;

  labSamples$: Observable<{ pager: any; results: LabSampleModel[] }>;
  mrnGeneratorSourceUuid$: Observable<string>;
  preferredPersonIdentifier$: Observable<string>;

  agencyConceptConfigs$: Observable<any>;
  agencyConceptConfigs: any;
  referFromFacilityVisitAttribute$: Observable<string>;

  referringDoctorAttributes$: Observable<any>;
  labNumberCharactersCount$: Observable<string>;
  testsFromExternalSystemsConfigs$: Observable<any[]>;
  labLocations$: Observable<any>;

  selectedTabGroup: string = "NEW";
  referringDoctorAttributes: any;
  referringDoctorFields: any;
  specimenDetailsFields: any;
  receivedOnField: DateField;
  agencyFormField: Dropdown;
  transportCondition: Dropdown;
  transportationTemperature: Dropdown;
  personDetailsData: any;
  primaryIdentifierFields: any;
  referFromFacilityVisitAttribute: string;
  personAgeField: any;
  personDOBField: any;
  personFieldsGroupThree: any;
  personFields: any;
  patientAgeFields: any;
  allRegistrationFields: any;
  clinicalFormFields: any;
  manyObservables$: Observable<any>;

  get maximumDate() {
    let maxDate = new Date();
    let maxMonth =
      (maxDate.getMonth() + 1).toString().length > 1
        ? maxDate.getMonth() + 1
        : `0${maxDate.getMonth() + 1}`;
    let maxDay =
      maxDate.getDate().toString().length > 1
        ? maxDate.getDate()
        : `0${maxDate.getDate()}`;
    return `${maxDate.getFullYear()}-${maxMonth}-${maxDay}`;
  }

  constructor(
    private samplesService: SamplesService,
    private systemSettingsService: SystemSettingsService,
    private store: Store<AppState>
  ) {}

  ngOnInit(): void {
    const paginationParameters = {
      page: 1,
      pageSize: 10,
    };

    this.currentUser$ = this.store.select(getCurrentUserDetails);

    this.store.dispatch(
      loadLocationsByTagNames({ tagNames: ["Lab+Location"] })
    );

    this.loadSamplesByPaginationDetails(paginationParameters);

    this.mrnGeneratorSourceUuid$ =
      this.systemSettingsService.getSystemSettingsByKey(
        "iCare.generateMRN.source"
      );
    this.preferredPersonIdentifier$ =
      this.systemSettingsService.getSystemSettingsByKey(
        "iCare.preferredPersonIdentifier"
      );
    this.referFromFacilityVisitAttribute$ =
      this.systemSettingsService.getSystemSettingsByKey(
        "lis.attribute.referFromFacility"
      );

    this.referFromFacilityVisitAttribute$.subscribe((response) => {
      console.log("==> referFromFacilityVisitAttribute", response)
    });
    
    this.agencyConceptConfigs$ = this.store.select(getConceptById, {
      id: this.LISConfigurations?.agencyConceptUuid,
    });
    
    this.referringDoctorAttributes$ = this.systemSettingsService
      .getSystemSettingsMatchingAKey("lis.attributes.referringDoctor")
      .pipe(
        withLatestFrom(this.agencyConceptConfigs$),
        map(([response1, response2]: [any, any]) => {
          if(response1 && response2){
            this.initializeRegistrationFields(response1, response2);
          }
          return response1;
        })
      )

    this.testsFromExternalSystemsConfigs$ =
      this.systemSettingsService.getSystemSettingsMatchingAKey(
        `iCare.externalSystems.integrated.tests`
      );
    this.store.dispatch(
      loadConceptByUuid({
        uuid: this.LISConfigurations?.agencyConceptUuid,
        fields: "custom:(uuid,display,setMembers:(uuid,display))",
      })
    );

    this.labNumberCharactersCount$ =
      this.systemSettingsService.getSystemSettingsByKey(
        "lis.settings.labNumber.charactersCount"
      );
  }

  getSelection(event: MatRadioChange): void {
    this.registrationCategory = event?.value;
  }

  getSamples(event: Event, action: string, pager: any): void {
    event.stopPropagation();
    this.loadSamplesByPaginationDetails({
      page: action === "next" ? pager?.page + 1 : pager?.page - 1,
      pageSize: 10,
    });
  }

  loadSamplesByPaginationDetails(paginationParameters: any): void {
    this.labSamples$ =
      this.samplesService.getCollectedSamplesByPaginationDetails(
        paginationParameters
      );
  }

  setTabGroup(event: Event, group: string): void {
    event.stopPropagation();
    this.selectedTabGroup = group;
  }

  initializeRegistrationFields(
    referringDoctorAttributes,
    agencyConceptConfigs
  ) {
    this.referringDoctorFields = referringDoctorAttributes?.forEach(
      (attribute) => {
        return {
          ...this.referringDoctorFields,
          ["attribute-" + attribute?.value]: new Textbox({
            id: "attribute-" + attribute?.value,
            key: "attribute-" + attribute?.value,
            label: attribute?.name,
            type: "text",
          }),
        };
      }
    );
    this.specimenDetailsFields = {
      specimen: new Dropdown({
        id: "specimen",
        key: "specimen",
        label: "Specimen",
        searchTerm: "SPECIMEN_SOURCE",
        options: [],
        conceptClass: "Specimen",
        searchControlType: "concept",
        shouldHaveLiveSearchForDropDownFields: true,
      }),
      condition: new Dropdown({
        id: "condition",
        key: "condition",
        label: "Condition",
        options: [],
        conceptClass: "condition",
        searchControlType: "concept",
        searchTerm: "SAMPLE_CONDITIONS",
        shouldHaveLiveSearchForDropDownFields: true,
      }),
      agency: new Dropdown({
        id: "agency",
        key: "agency",
        label: "urgency/Priority",
        options: agencyConceptConfigs?.setMembers.map((member) => {
          return {
            key: member?.uuid,
            value: member?.display,
            label: member?.display,
            name: member?.display,
          };
        }),
        shouldHaveLiveSearchForDropDownFields: false,
      }),
      receivedBy: new Dropdown({
        id: "receivedBy",
        key: "receivedBy",
        label: "Received By",
        options: [],
        shouldHaveLiveSearchForDropDownFields: true,
        searchControlType: "user",
      }),
      receivedOn: new DateField({
        id: "receivedOn",
        key: "receivedOn",
        label: "Received On",
        max: this.maximumDate,
      }),
      transportCondition: new Dropdown({
        id: "transportCondition",
        key: "transportCondition",
        label: "Transport Condition",
        searchTerm: "SAMPLE_TRANSPORT_CONDITION",
        required: false,
        options: [],
        multiple: false,
        conceptClass: "Misc",
        searchControlType: "concept",
        shouldHaveLiveSearchForDropDownFields: true,
      }),
      transportationTemperature: new Dropdown({
        id: "transportationTemperature",
        key: "transportationTemperature",
        label: "Transportation Temperature",
        searchTerm: "SAMPLE_TRANSPORT_TEMPERATURE",
        required: false,
        options: [],
        multiple: false,
        conceptClass: "Misc",
        searchControlType: "concept",
        shouldHaveLiveSearchForDropDownFields: true,
      }),
    };
    this.clinicalFormFields = {
      icd10: new Dropdown({
        id: "icd10",
        key: "icd10",
        label: "ICD 10",
        options: [],
        conceptClass: "Diagnosis",
        shouldHaveLiveSearchForDropDownFields: true,
      }),
      notes: new TextArea({
        id: "notes",
        key: "notes",
        label: "Clinical Information / History",
        type: "text",
      }),
      diagnosis: new Textbox({
        id: "diagnosis",
        key: "diagnosis",
        label: "Diagnosis - Clinical",
        type: "text",
      }),
    };
    this.personFields = {
      ["attribute-" + this.referFromFacilityVisitAttribute]: new Dropdown({
        id: "attribute-" + this.referFromFacilityVisitAttribute,
        key: "attribute-" + this.referFromFacilityVisitAttribute,
        options: [],
        label: "Facility Name",
        shouldHaveLiveSearchForDropDownFields: true,
        searchControlType: "healthFacility",
        searchTerm: "Health Facility",
        controlType: "location",
      }),
      firstName: new Textbox({
        id: "firstName",
        key: "firstName",
        label: "First name",
        required: true,
        type: "text",
      }),
      middleName: new Textbox({
        id: "middleName",
        key: "middleName",
        label: "Middle name",
        type: "text",
      }),
      lastName: new Textbox({
        id: "lastName",
        key: "lastName",
        label: "Last name",
        required: true,
        type: "text",
      }),
      gender: new Dropdown({
        id: "gender",
        key: "gender",
        label: "Gender",
        required: false,
        type: "text",
        options: [
          {
            key: "Male",
            label: "Male",
            value: "M",
          },
          {
            key: "Female",
            label: "Female",
            value: "F",
          },
        ],
        shouldHaveLiveSearchForDropDownFields: false,
      }),
    };
    this.patientAgeFields = {
      age: new Textbox({
        id: "age",
        key: "age",
        label: "Age",
        required: false,
        type: "number",
        min: 0,
        max: 150,
      }),
      dob: new DateField({
        id: "dob",
        key: "dob",
        label: "Date of birth",
        required: true,
        type: "date",
        max: this.maximumDate,
      }),
    };
    this.personFieldsGroupThree = {
      mobileNumber: new PhoneNumber({
        id: "mobileNumber",
        key: "mobileNumber",
        label: "Mobile number",
        required: false,
        type: "number",
        min: 0,
        placeholder: "Mobile number",
        category: "phoneNumber",
      }),
      email: new Textbox({
        id: "email",
        key: "email",
        label: "Email",
        required: false,
        type: "text",
        placeholder: "Email",
        category: "email",
      }),
      address: new TextArea({
        id: "address",
        key: "address",
        label: "Address",
        required: false,
        type: "text",
      }),
    };

    this.allRegistrationFields = {
      referringDoctorFields: this.referringDoctorFields,
      specimenDetailFields: this.specimenDetailsFields,
      personFields: this.personFields,
      patientAgeFields: this.patientAgeFields,
      personFieldsGroupThree: this.personFieldsGroupThree,
      clinicalFormFields: this.clinicalFormFields,
    };

    console.log("==> All ", this.allRegistrationFields);
  }
}
